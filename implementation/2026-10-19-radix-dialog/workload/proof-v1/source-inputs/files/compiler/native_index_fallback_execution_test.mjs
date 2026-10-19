import assert from "node:assert/strict";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { nativeModulePlugin } from "./vite_native_plugin.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDirectory = path.join(projectRoot, ".cache");
const sourceId = path.join(cacheDirectory, "native-index-fallback.tsx");
const outputPath = path.join(cacheDirectory, "native-index-fallback.mjs");
const plugin = nativeModulePlugin({ root: projectRoot });
plugin.configResolved?.call({}, { root: projectRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier, importer) {
    if (specifier === "../src/native_runtime_api.ts") {
      return { id: path.resolve(path.dirname(importer), specifier) };
    }
    return null;
  },
  error(message) {
    throw new Error(String(message));
  },
};

const size = 48;
const source = `import { createKeyedCollection, createStore, use, useEffect, useState } from "../src/native_runtime_api.ts";
export const leftRows = createKeyedCollection(
  Array.from({ length: ${size} }, (_, index) => ({ id: "left-" + index, value: index })),
  (item) => item.id,
);
export const rightRows = createKeyedCollection(
  Array.from({ length: ${size} }, (_, index) => ({ id: "right-" + index, value: index + 1000 })),
  (item) => item.id,
);
export const source = createStore(0);
export const trace = {
  rowRenders: 0,
  probeRenders: 0,
  mounts: 0,
  cleanups: 0,
  setters: Object.create(null),
  mountCounts: Object.create(null),
  cleanupCounts: Object.create(null),
};
export function Row({ item }) {
  trace.rowRenders++;
  const [local, setLocal] = useState(0);
  trace.setters[item.id] = setLocal;
  useEffect(() => {
    trace.mounts++;
    trace.mountCounts[item.id] = (trace.mountCounts[item.id] || 0) + 1;
    return () => {
      trace.cleanups++;
      trace.cleanupCounts[item.id] = (trace.cleanupCounts[item.id] || 0) + 1;
    };
  });
  return <li data-row={item.id} data-value={item.value} data-local={local}
    onClick={() => setLocal((previous) => previous + 1)}>{item.value}:{local}</li>;
}
export function StoreProbe() {
  trace.probeRenders++;
  const value = use(source);
  return <output data-source={value}>source:{value}</output>;
}
export function LeftRows() {
  return <ul data-region="left">{leftRows.map((item) => <Row key={item.id} item={item} />)}</ul>;
}
export function RightRows() {
  return <ul data-region="right">{rightRows.map((item) => <Row key={item.id} item={item} />)}</ul>;
}
export function App() {
  return <section><StoreProbe /><LeftRows /><RightRows /></section>;
}`;

let root;
let app;
try {
  await mkdir(cacheDirectory, { recursive: true });
  const transformed = await plugin.transform.call(context, source, sourceId);
  assert.ok(transformed?.code, "nativeModulePlugin did not compile the authored TSX");
  assert.match(transformed.code, /renderCollectionAt/, "keyed collections were not compiler-lowered");
  assert.match(transformed.code, /useStoreAt/, "authored use(store) was not compiler-lowered");
  assert.doesNotMatch(source, /@native-ui|@jsx|\bjsx\s*[,}]/, "authored app must not use a marker, pragma, or factory import");
  await writeFile(outputPath, transformed.code);
  app = await import(`${pathToFileURL(outputPath).href}?run=${Date.now()}`);

  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  let counters = {};
  root = createNativeRoot(host, container, {
    scheduleCommit() {},
    profileCounter(next) {
      counters = { ...counters, ...next };
    },
  });
  root.mount(jsx(app.App, {}));

  const find = (predicate) => {
    const visit = (node) => {
      if (predicate(node)) return node;
      for (const child of node.children) {
        const found = visit(child);
        if (found) return found;
      }
      return undefined;
    };
    return visit(container);
  };
  const list = (region) => find((node) => node.tag === "ul" && node.props["data-region"] === region);
  const sourceNode = () => find((node) => "data-source" in node.props);
  const nodeMap = (region) => new Map(list(region).children.map((node) => [node.props["data-row"], node]));
  const order = {
    left: Array.from({ length: size }, (_, index) => `left-${index}`),
    right: Array.from({ length: size }, (_, index) => `right-${index}`),
  };
  const values = new Map([
    ...order.left.map((id, index) => [id, index]),
    ...order.right.map((id, index) => [id, index + 1000]),
  ]);
  const assertProjection = (stage) => {
    for (const region of ["left", "right"]) {
      const nodes = list(region).children;
      assert.deepEqual(nodes.map((node) => node.props["data-row"]), order[region], `${stage}: ${region} order mismatch`);
      for (const node of nodes) {
        assert.equal(node.props["data-value"], values.get(node.props["data-row"]), `${stage}: value mismatch for ${node.props["data-row"]}`);
      }
    }
  };
  const resetCounters = () => { counters = {}; };
  const assertNoFullIndexRebuild = (stage, actualCounters) => {
    assert.equal(actualCounters["vdom.key-index.full-rebuild-visits"] ?? 0, 0, `${stage}: full key-index rebuild occurred`);
    assert.equal(actualCounters["vdom.key-index.subtree-rescan-old-visits"] ?? 0, 0, `${stage}: old keyed subtree was rescanned`);
    assert.equal(actualCounters["vdom.key-index.subtree-rescan-new-visits"] ?? 0, 0, `${stage}: new keyed subtree was rescanned`);
  };
  const applyDelta = (collection, region, operation, project, expectedRenders, stage) => {
    const before = nodeMap(region);
    const previousRenders = app.trace.rowRenders;
    resetCounters();
    assert.equal(collection.apply(collection.version, [operation]).ok, true, `${stage}: sparse operation rejected`);
    project();
    root.flush();
    const after = nodeMap(region);
    assert.equal(app.trace.rowRenders - previousRenders, expectedRenders, `${stage}: unexpected row owner work`);
    for (const [id, node] of before) {
      if (order[region].includes(id)) assert.equal(after.get(id), node, `${stage}: surviving keyed host ${id} changed`);
    }
    assertProjection(stage);
    const operationCounters = { ...counters };
    assertNoFullIndexRebuild(stage, operationCounters);
    assert.equal(operationCounters["vdom.keyed-region-delta.operations"], 1, `${stage}: compiler collection did not use one sparse region operation`);
    return operationCounters;
  };

  assertProjection("mount");
  assert.equal(app.trace.rowRenders, size * 2);
  assert.equal(app.trace.mounts, size * 2);
  // Every key is unique across both regions, so the generic root index has no
  // ambiguity when the same owner tree is committed between sparse deltas.
  assert.equal(new Set([...order.left, ...order.right]).size, size * 2);
  const leftLocalId = "left-11";
  const leftLocal = nodeMap("left").get(leftLocalId);
  app.trace.setters[leftLocalId](9);
  root.flush();
  assert.equal(leftLocal.props["data-local"], 9);

  const sparseCounters = [];
  sparseCounters.push(applyDelta(app.leftRows, "left", {
    type: "replace", key: "left-3", value: { id: "left-3", value: 3003 },
  }, () => values.set("left-3", 3003), 1, "sparse replace before store commit"));
  sparseCounters.push(applyDelta(app.rightRows, "right", {
    type: "move", key: "right-20", beforeKey: null,
  }, () => {
    order.right.splice(order.right.indexOf("right-20"), 1);
    order.right.push("right-20");
  }, 0, "sparse move before store commit"));

  const beforeStoreNodes = new Map([...nodeMap("left"), ...nodeMap("right")]);
  const beforeStoreRows = app.trace.rowRenders;
  const beforeStoreProbe = app.trace.probeRenders;
  resetCounters();
  assert.equal(app.source.dispatch((value) => value + 1), true);
  root.flush();
  const storeCounters = { ...counters };
  const storeRowRenders = app.trace.rowRenders - beforeStoreRows;
  const storeProbeRenders = app.trace.probeRenders - beforeStoreProbe;
  const storeOwnerVisits = storeCounters["owner.component-visits"] ?? 0;
  const storeBindingIndexVisits = storeCounters["vdom.binding-index.full-rebuild-visits"] ?? 0;
  assert.equal(sourceNode().props["data-source"], 1, "generic store commit did not publish its projection");
  assert.equal(storeProbeRenders, 1, "generic store commit did not execute exactly one reader");
  assert.equal(storeRowRenders, 0, "generic store commit reran unrelated row owners");
  assert.equal(storeOwnerVisits, 1, "store commit visits exactly its leaf probe");
  assert.equal(storeCounters["store.sparse.eligibility-owner-visits"], 1, "one probe eligibility check");
  assert.equal(storeCounters["owner.cached-reused"] ?? 0, 0, "store commit must not scan cached rows");
  assert.equal(storeBindingIndexVisits, 0, "generic store commit rebuilt binding index");
  assert.equal(storeCounters["vdom.binding-index.incremental-group-attaches"] ?? 0, 0, "generic store commit attached unrelated writers");
  assert.equal(storeCounters["vdom.binding-index.incremental-group-detaches"] ?? 0, 0, "generic store commit detached unrelated writers");
  assertNoFullIndexRebuild("store generic commit", storeCounters);
  for (const [id, node] of beforeStoreNodes) {
    const region = id.startsWith("left-") ? "left" : "right";
    assert.equal(nodeMap(region).get(id), node, `store generic commit replaced keyed host ${id}`);
  }
  assert.equal(leftLocal.props["data-local"], 9, "store generic commit lost row-local state");
  assertProjection("store generic commit");

  const inserted = { id: "left-after-store", value: 4242 };
  sparseCounters.push(applyDelta(app.leftRows, "left", {
    type: "insert", key: inserted.id, value: inserted, beforeKey: "left-0",
  }, () => {
    order.left.unshift(inserted.id);
    values.set(inserted.id, inserted.value);
  }, 1, "sparse insert after store commit"));
  sparseCounters.push(applyDelta(app.leftRows, "left", {
    type: "move", key: "left-11", beforeKey: null,
  }, () => {
    order.left.splice(order.left.indexOf("left-11"), 1);
    order.left.push("left-11");
  }, 0, "sparse move after store commit"));
  sparseCounters.push(applyDelta(app.rightRows, "right", {
    type: "replace", key: "right-7", value: { id: "right-7", value: 7007 },
  }, () => values.set("right-7", 7007), 1, "sparse replace after store commit"));
  const removedRight = nodeMap("right").get("right-4");
  const rightCleanupBefore = app.trace.cleanupCounts["right-4"] ?? 0;
  sparseCounters.push(applyDelta(app.rightRows, "right", {
    type: "remove", key: "right-4",
  }, () => {
    order.right.splice(order.right.indexOf("right-4"), 1);
    values.delete("right-4");
  }, 0, "sparse remove after store commit"));
  assert.equal(nodeMap("right").has("right-4"), false);
  assert.equal(app.trace.cleanupCounts["right-4"], rightCleanupBefore + 1, "sparse removal did not clean the removed row effect once");
  assert.notEqual(removedRight, undefined);
  assert.equal(leftLocal.props["data-local"], 9, "post-store sparse edits lost keyed local state");

  root.dispose();
  assert.equal(root.diagnostics().disposed, true);
  assert.equal(app.trace.mounts, app.trace.cleanups, "root teardown did not clean every row effect exactly once");
  for (const [id, mountCount] of Object.entries(app.trace.mountCounts)) {
    assert.equal(app.trace.cleanupCounts[id] ?? 0, mountCount, `row ${id} effect cleanup count mismatch`);
  }
  assert.equal(app.leftRows.stats().readerCount, 0, "left collection reader survived teardown");
  assert.equal(app.rightRows.stats().readerCount, 0, "right collection reader survived teardown");
  assert.deepEqual(app.source.diagnostics(), { roots: 0, listeners: 0, readers: 0, retainedActions: 0, transitions: 0 });

  console.log("Compiled full-commit key-index delta execution PASS:", JSON.stringify({
    sizePerRegion: size,
    totalInitiallyMounted: size * 2,
    genericStoreCommit: {
      rowRenders: storeRowRenders,
      probeRenders: storeProbeRenders,
      ownerComponentVisits: storeOwnerVisits,
      bindingIndexRebuildVisits: storeBindingIndexVisits,
      keyIndexCounters: storeCounters,
    },
    sparseCounters,
    finalRows: { left: order.left.length, right: order.right.length },
    finalRowRenders: app.trace.rowRenders,
    effects: { mounts: app.trace.mounts, cleanups: app.trace.cleanups },
  }));
} finally {
  try {
    root?.dispose();
    if (root) assert.equal(root.diagnostics().disposed, true, "generated root was not disposed during final cleanup");
    if (app) {
      assert.equal(app.leftRows.stats().readerCount, 0, "left collection reader survived final cleanup");
      assert.equal(app.rightRows.stats().readerCount, 0, "right collection reader survived final cleanup");
      assert.deepEqual(app.source.diagnostics(), { roots: 0, listeners: 0, readers: 0, retainedActions: 0, transitions: 0 });
    }
  } finally {
    try {
      await unlink(outputPath);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    plugin.closeBundle?.call({});
  }
}
