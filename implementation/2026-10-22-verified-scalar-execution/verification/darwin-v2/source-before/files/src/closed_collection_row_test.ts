import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import {
  ComponentStateRoot, defineComponent, renderCollectionAt,
} from "./component_state_runtime.ts";
import {
  invalidateCompiledSemanticPlan, registerCompiledSemanticPlan,
} from "./compiled_semantic_plan.ts";
import { createKeyedCollection } from "./keyed_collection.ts";
import { jsx } from "./jsx_binding_runtime.ts";
import { storeRecord } from "./owned_store_record.ts";
import { type MemoryNode, MemoryVDOMHost } from "./vdom_snapshot_runtime.ts";

type RowData = { id: string; value: number };

const fixture = (name: string) => {
  const sourceFile = `closed-row/${name}.tsx`;
  const revision = "closed-row-v1";
  registerCompiledSemanticPlan({
    schema_version: 1, source_file: sourceFile, module_revision: revision,
    owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] },
  });
  const rowId = `${sourceFile}#component:Row`;
  const listId = `${sourceFile}#component:List`;
  const site = `${listId}#collection:0`;
  const collection = createKeyedCollection<RowData>([storeRecord({ id: "a", value: 1 })],
    (row) => row.id);
  let rowRenders = 0;
  let listRenders = 0;
  const Row = defineComponent(rowId, ({ row }: { row: RowData }) => {
    rowRenders++;
    return jsx("output", { "data-value": row.value }, row.value);
  });
  const List = defineComponent(listId, ({ collection: rows }: {
    collection: typeof collection;
  }) => {
    listRenders++;
    return jsx("div", {}, renderCollectionAt(site, rows,
      (row) => jsx(Row, { row })));
  }, {
    propOnlySites: [], closedCollectionSites: [site],
    closedCollectionRowPrograms: [{
      schemaVersion: 1, collectionSiteId: site, componentProgramId: listId,
      rowComponentProgramId: rowId, moduleRevision: revision,
      rowComponent: Row, rowProp: "row",
      inputs: [{ path: ["value"] }],
      host: { tag: "output", key: null,
        props: [["data-value", { kind: "input", index: 0 }]],
        children: [{ kind: "text", expression: { kind: "input", index: 0 } }] },
    }],
  });
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const root = new ComponentStateRoot(host, container, { scheduleCommit() {} });
  root.mount(jsx(List, { collection }));
  const rows = () => container.children[0].children;
  return { collection, container, root, rows, sourceFile,
    renders: () => ({ row: rowRenders, list: listRenders }) };
};

const publish = (candidate: NonNullable<ReturnType<
  ComponentStateRoot<MemoryNode, MemoryNode>["prepareCollections"]
>>) => {
  assert(candidate.validate());
  candidate.commitHost();
  assert(candidate.validatePostHost());
  candidate.preparePublication();
  candidate.publish();
  candidate.runEffects();
};

Deno.test("closed row insert and same-key replace publish without authored row renders", () => {
  const f = fixture("ordinary");
  try {
    const first = f.rows()[0];
    assertEquals(f.renders(), { row: 1, list: 1 });
    assert(f.collection.apply(f.collection.version, [{
      type: "insert", key: "b", value: storeRecord({ id: "b", value: 2 }), beforeKey: null,
    }]).ok);
    const inserted = f.root.prepareCollections([f.collection]);
    assert(inserted, "closed insert was declined on an unmarked root");
    publish(inserted);
    assertEquals(f.rows().map((row) => row.props["data-value"]), [1, 2]);
    assertEquals(f.renders(), { row: 1, list: 1 });

    assert(f.collection.apply(f.collection.version, [{
      type: "replace", key: "a", value: storeRecord({ id: "a", value: 7 }),
    }]).ok);
    const replaced = f.root.prepareCollections([f.collection]);
    assert(replaced, "closed replace was declined");
    publish(replaced);
    assertStrictEquals(f.rows()[0], first);
    assertEquals(f.rows()[0].props["data-value"], 7);
    assertEquals(f.renders(), { row: 1, list: 1 });

    assert(f.collection.apply(f.collection.version, [
      { type: "remove", key: "a" },
    ]).ok);
    const removed = f.root.prepareCollections([f.collection]);
    assert(removed, "closed removal was declined");
    publish(removed);
    assert(f.collection.apply(f.collection.version, [
      { type: "insert", key: "a", value: storeRecord({ id: "a", value: 9 }), beforeKey: null },
    ]).ok);
    const reincarnated = f.root.prepareCollections([f.collection]);
    assert(reincarnated, "closed remove/reinsert was declined");
    publish(reincarnated);
    assert(f.rows()[1] !== first, "new incarnation reused the retired host");
    assertEquals(f.rows()[1].props["data-value"], 9);
  } finally {
    f.root.dispose();
  }
});

Deno.test("closed row publication uses canonical owner lineage after preparation", () => {
  const f = fixture("lineage");
  const originalLineage = f.root.world.ownerLineage;
  const originalClear = f.root.world.clearChangesThrough;
  try {
    assert(f.collection.apply(f.collection.version, [{
      type: "insert", key: "b", value: storeRecord({ id: "b", value: 2 }), beforeKey: null,
    }]).ok);
    const candidate = f.root.prepareCollections([f.collection]);
    assert(candidate);
    let overrideCalls = 0;
    f.root.world.ownerLineage = () => {
      overrideCalls++;
      throw new Error("public lineage override ran during publication");
    };
    f.root.world.clearChangesThrough = () => {
      overrideCalls++;
      throw new Error("empty World acknowledgement ran during row publication");
    };
    publish(candidate);
    assertEquals(overrideCalls, 0);
    assertEquals(f.rows().map((row) => row.props["data-value"]), [1, 2]);
    assertEquals(f.renders(), { row: 1, list: 1 });
  } finally {
    f.root.world.ownerLineage = originalLineage;
    f.root.world.clearChangesThrough = originalClear;
    f.root.dispose();
  }
});

Deno.test("closed row candidate rejects newer collection history without acknowledging it", () => {
  const f = fixture("stale");
  try {
    assert(f.collection.apply(f.collection.version, [{
      type: "replace", key: "a", value: storeRecord({ id: "a", value: 2 }),
    }]).ok);
    const stale = f.root.prepareCollections([f.collection]);
    assert(stale);
    assert(f.collection.apply(f.collection.version, [{
      type: "replace", key: "a", value: storeRecord({ id: "a", value: 3 }),
    }]).ok);
    assert(!stale.validate(), "older row cut accepted newer collection input");
    stale.discard();
    const fresh = f.root.prepareCollections([f.collection]);
    assert(fresh);
    publish(fresh);
    assertEquals(f.rows()[0].props["data-value"], 3);
    assertEquals(f.renders(), { row: 1, list: 1 });
  } finally {
    f.root.dispose();
  }
});

Deno.test("closed row accessor payload declines before the authored row body", () => {
  const f = fixture("accessor");
  try {
    let getterCalls = 0;
    const row = { id: "b", get value() { getterCalls++; return 4; } };
    assert(f.collection.apply(f.collection.version, [{
      type: "insert", key: "b", value: row, beforeKey: null,
    }]).ok);
    assertStrictEquals(f.root.prepareCollections([f.collection]), null);
    assertEquals(getterCalls, 0);
    assertEquals(f.renders(), { row: 1, list: 1 });
    assertEquals(f.rows().length, 1);
  } finally {
    f.root.dispose();
  }
});

Deno.test("an owned row wrapped in a Proxy and an ordinary frozen row stay generic", () => {
  const proxied = fixture("proxy");
  try {
    let reads = 0;
    let descriptors = 0;
    const wrapped = new Proxy(storeRecord({ id: "b", value: 4 }), {
      get(target, name, receiver) {
        reads++;
        return Reflect.get(target, name, receiver);
      },
      getOwnPropertyDescriptor(target, name) {
        descriptors++;
        return Reflect.getOwnPropertyDescriptor(target, name);
      },
    });
    assert(proxied.collection.apply(proxied.collection.version, [{
      type: "insert", key: "b", value: wrapped, beforeKey: null,
    }]).ok);
    const before = { reads, descriptors };
    assertStrictEquals(proxied.root.prepareCollections([proxied.collection]), null);
    assertEquals({ reads, descriptors }, before);
    assertEquals(proxied.renders(), { row: 1, list: 1 });
  } finally {
    proxied.root.dispose();
  }

  const frozen = fixture("frozen");
  try {
    assert(frozen.collection.apply(frozen.collection.version, [{
      type: "insert", key: "b", value: Object.freeze({ id: "b", value: 4 }),
      beforeKey: null,
    }]).ok);
    assertStrictEquals(frozen.root.prepareCollections([frozen.collection]), null);
    assertEquals(frozen.renders(), { row: 1, list: 1 });
  } finally {
    frozen.root.dispose();
  }
});

Deno.test("closed row candidates reject changed collection API and code revision", () => {
  const changedApi = fixture("api-change");
  const originalSnapshot = changedApi.collection.snapshot;
  try {
    assert(changedApi.collection.apply(changedApi.collection.version, [{
      type: "insert", key: "b", value: storeRecord({ id: "b", value: 2 }),
      beforeKey: null,
    }]).ok);
    const candidate = changedApi.root.prepareCollections([changedApi.collection]);
    assert(candidate);
    changedApi.collection.snapshot = () => [];
    assert(!candidate.validate(), "replaced collection method retained admission");
    candidate.discard();
    assertEquals(changedApi.rows().length, 1);
  } finally {
    changedApi.collection.snapshot = originalSnapshot;
    changedApi.root.dispose();
  }

  const changedCode = fixture("code-change");
  try {
    assert(changedCode.collection.apply(changedCode.collection.version, [{
      type: "insert", key: "b", value: storeRecord({ id: "b", value: 2 }),
      beforeKey: null,
    }]).ok);
    const candidate = changedCode.root.prepareCollections([changedCode.collection]);
    assert(candidate);
    assert(invalidateCompiledSemanticPlan(changedCode.sourceFile));
    assert(!candidate.validate(), "retired Row revision retained admission");
    candidate.discard();
    assertEquals(changedCode.rows().length, 1);
  } finally {
    changedCode.root.dispose();
  }
});
