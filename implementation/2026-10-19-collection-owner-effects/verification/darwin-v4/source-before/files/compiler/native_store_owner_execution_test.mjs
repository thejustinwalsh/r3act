import assert from "node:assert/strict";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { nativeModulePlugin } from "./vite_native_plugin.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDirectory = path.join(projectRoot, ".cache");
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

const makeSource = (size) => `import { createKeyedCollection, createStore, use, useEffect, useState } from "../src/native_runtime_api.ts";
export const rows = createKeyedCollection(
  Array.from({ length: ${size} }, (_, index) => ({ id: String(index), label: "row-" + index })),
  (row) => row.id,
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
export function Row({ row }) {
  trace.rowRenders++;
  const [local, setLocal] = useState(0);
  trace.setters[row.id] = setLocal;
  useEffect(() => {
    trace.mounts++;
    trace.mountCounts[row.id] = (trace.mountCounts[row.id] || 0) + 1;
    return () => {
      trace.cleanups++;
      trace.cleanupCounts[row.id] = (trace.cleanupCounts[row.id] || 0) + 1;
    };
  });
  return <li data-row={row.id} data-label={row.label} data-local={local}
    onClick={() => setLocal((previous) => previous + 1)}>{row.label}:{local}</li>;
}
export function StoreProbe() {
  trace.probeRenders++;
  const value = use(source);
  return <output data-source={value}>source:{value}</output>;
}
export function App() {
  return <section><StoreProbe /><ul>{rows.map((row) => <Row key={row.id} row={row} />)}</ul></section>;
}`;

const walk = (node, predicate) => {
  if (predicate(node)) return node;
  for (const child of node.children) {
    const match = walk(child, predicate);
    if (match) return match;
  }
  return undefined;
};

const sizes = [1_000, 10_000, 50_000];
const summaries = [];
const rootsToDispose = [];
const cleanupRecords = [];
const outputsToRemove = [];
try {
  await mkdir(cacheDirectory, { recursive: true });
  for (const size of sizes) {
    const stem = `native-store-owner-${size}`;
    const sourceId = path.join(cacheDirectory, `${stem}.tsx`);
    const outputPath = path.join(cacheDirectory, `${stem}.mjs`);
    outputsToRemove.push(outputPath);
    const transformed = await plugin.transform.call(context, makeSource(size), sourceId);
    assert.ok(transformed?.code, `nativeModulePlugin did not compile the ${size}-row TSX module`);
    assert.match(transformed.code, /renderCollectionAt/, "keyed collection was not compiler-lowered");
    assert.match(transformed.code, /__nativeBindStateProps?At\(/, "row-local numeric props were not compiler-bound");
    assert.match(transformed.code, /useStoreAt/, "authored use(store) was not compiler-lowered");
    await writeFile(outputPath, transformed.code);
    const app = await import(`${pathToFileURL(outputPath).href}?size=${size}&run=${Date.now()}`);

    const host = new MemoryVDOMHost();
    const container = host.createContainer();
    let profileCounters = {};
    const root = createNativeRoot(host, container, {
      scheduleCommit() {},
      profileCounter(next) {
        profileCounters = { ...profileCounters, ...next };
      },
    });
    rootsToDispose.push(root);
    cleanupRecords.push({ size, root, app });
    root.mount(jsx(app.App, {}));

    const list = () => walk(container, (node) => node.tag === "ul");
    const sourceNode = () => walk(container, (node) => "data-source" in node.props);
    const rowMap = () => new Map(list().children.map((node) => [node.props["data-row"], node]));
    const statefulId = String(Math.floor(size / 2));
    const statefulNode = () => rowMap().get(statefulId);
    const order = Array.from({ length: size }, (_, index) => String(index));
    const projectedLabels = new Map(order.map((id, index) => [id, `row-${index}`]));
    const assertProjection = (stage) => {
      const nodes = list().children;
      assert.equal(nodes.length, order.length, `${size} rows ${stage}: membership count mismatch`);
      assert.deepEqual(nodes.map((node) => node.props["data-row"]), order, `${size} rows ${stage}: order diverged`);
      for (const node of nodes) {
        const id = node.props["data-row"];
        assert.equal(node.props["data-label"], projectedLabels.get(id), `${size} rows ${stage}: label diverged for ${id}`);
      }
    };
    assertProjection("initial");
    assert.equal(app.trace.rowRenders, size, `${size} rows: unexpected initial row executions`);
    assert.equal(app.trace.probeRenders, 1, `${size} rows: store probe did not mount once`);
    assert.equal(app.trace.mounts, size, `${size} rows: effect setup count mismatch`);

    const retainedMap = rowMap();
    const retained = retainedMap.get(statefulId);
    app.trace.setters[statefulId](7);
    root.flush();
    assert.equal(rowMap().get(statefulId), retained, `${size} rows: state update replaced its host node`);
    assert.equal(retained.props["data-local"], 7, `${size} rows: compiled numeric state binding did not update`);

    const rowsBeforeStoreOnly = app.trace.rowRenders;
    const probesBeforeStoreOnly = app.trace.probeRenders;
    profileCounters = {};
    assert.equal(app.source.dispatch((previous) => previous + 1), true);
    root.flush();
    assert.equal(sourceNode().props["data-source"], 1, `${size} rows: store-only projection stayed stale`);
    assert.equal(app.trace.probeRenders - probesBeforeStoreOnly, 1, `${size} rows: store-only update did not rerun exactly one probe owner`);
    const storeOnlyRowRenders = app.trace.rowRenders - rowsBeforeStoreOnly;
    const countersAfterStoreOnly = { ...profileCounters };
    assert.equal(storeOnlyRowRenders, 0, `${size} rows: store-only update reran unrelated keyed rows`);
    const storeOnlyOwnerVisits = countersAfterStoreOnly["owner.component-visits"] ?? 0;
    const storeOnlyBindingIndexVisits = countersAfterStoreOnly["vdom.binding-index.full-rebuild-visits"] ?? 0;
    assert.equal(storeOnlyOwnerVisits, 1, `${size} rows: store-only candidate must visit exactly its one leaf reader`);
    assert.equal(countersAfterStoreOnly["store.sparse.eligibility-owner-visits"], 1, "one reader eligibility check");
    assert.equal(countersAfterStoreOnly["owner.cached-reused"] ?? 0, 0, "store-only must not copy cached row ownership");
    assert.equal(storeOnlyBindingIndexVisits, 0, `${size} rows: store-only binding index rebuilt`);
    assert.equal(countersAfterStoreOnly["vdom.binding-index.incremental-group-attaches"] ?? 0, 0, "store-only attached unrelated writers");
    assert.equal(countersAfterStoreOnly["vdom.binding-index.incremental-group-detaches"] ?? 0, 0, "store-only detached unrelated writers");
    assert.equal(
      countersAfterStoreOnly["vdom.key-index.full-rebuild-visits"] ?? 0,
      0,
      `${size} rows: store-only generic commit rebuilt the full key index`,
    );
    assert.equal(
      countersAfterStoreOnly["vdom.key-index.subtree-rescan-old-visits"] ?? 0,
      0,
      `${size} rows: store-only generic commit rescanned old keyed subtrees`,
    );
    assert.equal(
      countersAfterStoreOnly["vdom.key-index.subtree-rescan-new-visits"] ?? 0,
      0,
      `${size} rows: store-only generic commit rescanned new keyed subtrees`,
    );
    const afterStoreOnlyNodes = rowMap();
    for (const [id, node] of retainedMap) {
      assert.equal(afterStoreOnlyNodes.get(id), node, `${size} rows: store-only update replaced keyed host ${id}`);
    }
    assert.equal(retained.props["data-local"], 7, `${size} rows: store-only update lost keyed local state`);

    const beforeMixed = app.trace.rowRenders;
    const probesBeforeMixed = app.trace.probeRenders;
    const mountsBeforeMixed = app.trace.mounts;
    const cleanupsBeforeMixed = app.trace.cleanups;
    profileCounters = {};
    const added = { id: "mixed-new", label: "mixed-label" };
    assert.equal(app.source.dispatch((previous) => previous + 1), true);
    assert.equal(app.rows.apply(app.rows.version, [{
      type: "insert",
      key: added.id,
      value: added,
      beforeKey: "0",
    }]).ok, true);
    order.splice(0, 0, added.id);
    projectedLabels.set(added.id, added.label);
    root.flush();
    const mixedRowRenders = app.trace.rowRenders - beforeMixed;
    const countersAfterMixed = { ...profileCounters };
    const mixedOwnerVisits = countersAfterMixed["owner.component-visits"] ?? 0;
    const mixedBindingIndexVisits = countersAfterMixed["vdom.binding-index.full-rebuild-visits"] ?? 0;
    assert.equal(mixedOwnerVisits, 2, `${size} rows: mixed candidate must visit only its inserted row and store-reader owner`);
    assert.equal(mixedBindingIndexVisits, 0, `${size} rows: mixed binding index rebuilt`);
    // The coherent candidate reports collection edits and independent leaf
    // replacements through their respective host phases. Account for both.
    const mixedWriterAttaches = (countersAfterMixed["vdom.binding-index.incremental-group-attaches"] ?? 0)
      + (countersAfterMixed["vdom.keyed-region-delta.binding-attaches"] ?? 0);
    const mixedWriterDetaches = (countersAfterMixed["vdom.binding-index.incremental-group-detaches"] ?? 0)
      + (countersAfterMixed["vdom.keyed-region-delta.binding-detaches"] ?? 0);
    assert.equal(mixedWriterAttaches, 1, "mixed insert must register exactly one new writer");
    assert.equal(mixedWriterDetaches, 0, "mixed insert detached surviving writers");
    assert.equal(mixedRowRenders, 1, `${size} rows: mixed store/insert flush reran existing row owners`);
    assert.equal(app.trace.probeRenders - probesBeforeMixed, 1, `${size} rows: mixed flush did not update the store owner once`);
    assert.equal(sourceNode().props["data-source"], 2, `${size} rows: mixed store projection is incoherent`);
    assert.equal(
      countersAfterMixed["vdom.key-index.full-rebuild-visits"] ?? 0,
      0,
      `${size} rows: mixed generic commit rebuilt the full key index`,
    );
    assert.equal(
      countersAfterMixed["vdom.key-index.subtree-rescan-old-visits"] ?? 0,
      0,
      `${size} rows: mixed generic commit rescanned old keyed subtrees`,
    );
    assert.equal(
      countersAfterMixed["vdom.key-index.subtree-rescan-new-visits"] ?? 0,
      0,
      `${size} rows: mixed generic commit rescanned new keyed subtrees`,
    );
    assertProjection("mixed insert");
    const afterMixedNodes = rowMap();
    for (const [id, node] of retainedMap) {
      assert.equal(afterMixedNodes.get(id), node, `${size} rows: mixed flush replaced surviving host ${id}`);
    }
    assert.equal(afterMixedNodes.get(statefulId), retained, `${size} rows: mixed flush replaced the stateful host`);
    assert.equal(retained.props["data-local"], 7, `${size} rows: mixed flush lost local state`);
    assert.equal(app.trace.mounts - app.trace.cleanups, size + 1, `${size} rows: mixed flush changed unrelated effect lifetimes`);
    assert.equal(app.trace.mounts - mountsBeforeMixed, 1, `${size} rows: mixed insert did not start exactly one new-row effect`);
    assert.equal(app.trace.cleanups - cleanupsBeforeMixed, 0, `${size} rows: mixed insert cleaned an unaffected row`);

    const replace = (id, label, stage) => {
      const previousNode = rowMap().get(id);
      const previousRenders = app.trace.rowRenders;
      assert.equal(app.rows.apply(app.rows.version, [{
        type: "replace",
        key: id,
        value: { id, label },
      }]).ok, true);
      projectedLabels.set(id, label);
      root.flush();
      assert.equal(app.trace.rowRenders - previousRenders, 1, `${size} rows: ${stage} did not execute exactly the changed row owner`);
      assert.equal(rowMap().get(id), previousNode, `${size} rows: ${stage} replaced a same-key host`);
      assertProjection(stage);
    };
    replace("mixed-new", "mixed-updated", "replace inserted row");
    replace(statefulId, `row-${statefulId}-updated`, "replace stateful row");
    assert.equal(retained.props["data-local"], 7, `${size} rows: same-key item update lost local state`);

    const moveId = statefulId;
    const moveNode = rowMap().get(moveId);
    const rendersBeforeMove = app.trace.rowRenders;
    assert.equal(app.rows.apply(app.rows.version, [{
      type: "move",
      key: moveId,
      beforeKey: null,
    }]).ok, true);
    order.splice(order.indexOf(moveId), 1);
    order.push(moveId);
    root.flush();
    assert.equal(app.trace.rowRenders, rendersBeforeMove, `${size} rows: reorder reran row owners`);
    assert.equal(rowMap().get(moveId), moveNode, `${size} rows: reorder replaced the stateful host`);
    assert.equal(moveNode.props["data-local"], 7, `${size} rows: reorder lost local state`);
    assertProjection("move stateful row");

    const removeId = "3";
    const removeNode = rowMap().get(removeId);
    const cleanupBeforeRemove = app.trace.cleanupCounts[removeId] ?? 0;
    const rendersBeforeRemove = app.trace.rowRenders;
    assert.equal(app.rows.apply(app.rows.version, [{ type: "remove", key: removeId }]).ok, true);
    order.splice(order.indexOf(removeId), 1);
    projectedLabels.delete(removeId);
    root.flush();
    assert.equal(app.trace.rowRenders, rendersBeforeRemove, `${size} rows: removal reran surviving row owners`);
    assert.equal(rowMap().has(removeId), false, `${size} rows: removed row stayed mounted`);
    assert.equal(app.trace.cleanupCounts[removeId], cleanupBeforeRemove + 1, `${size} rows: remove did not clean the effect once`);
    assert.equal(app.trace.mounts - app.trace.cleanups, order.length, `${size} rows: effect count diverged after removal`);
    assertProjection("remove row");
    assert.notEqual(removeNode, undefined);

    const rendersBeforeRemoveNew = app.trace.rowRenders;
    assert.equal(app.rows.apply(app.rows.version, [{ type: "remove", key: "mixed-new" }]).ok, true);
    order.splice(order.indexOf("mixed-new"), 1);
    projectedLabels.delete("mixed-new");
    root.flush();
    assert.equal(app.trace.rowRenders, rendersBeforeRemoveNew, `${size} rows: removing inserted row reran survivors`);
    assert.equal(app.trace.cleanupCounts["mixed-new"], 1, `${size} rows: inserted row did not clean its effect once`);
    assertProjection("remove inserted row");

    const countersAtEnd = { ...profileCounters };
    root.dispose();
    assert.equal(app.trace.mounts, app.trace.cleanups, `${size} rows: teardown did not clean every row effect exactly once`);
    for (const [id, mountCount] of Object.entries(app.trace.mountCounts)) {
      assert.equal(app.trace.cleanupCounts[id] ?? 0, mountCount, `${size} rows: effect cleanup mismatch for ${id}`);
    }
    assert.equal(app.rows.stats().readerCount, 0, `${size} rows: collection reader survived root teardown`);
    assert.equal(app.rows.stats().retainedBatches, 0, `${size} rows: collection history survived root teardown`);
    assert.deepEqual(
      app.source.diagnostics(),
      { roots: 0, listeners: 0, readers: 0, retainedActions: 0, transitions: 0 },
      `${size} rows: store subscription/readers survived root teardown`,
    );
    summaries.push({
      size,
      storeOnlyRowRenders,
      storeOnlyOwnerVisits,
      storeOnlyBindingIndexVisits,
      storeOnlyProfileCounters: countersAfterStoreOnly,
      mixedRowRenders,
      mixedOwnerVisits,
      mixedBindingIndexVisits,
      mixedProfileCounters: countersAfterMixed,
      probeRenders: app.trace.probeRenders,
      totalRowRenders: app.trace.rowRenders,
      profileCounters: countersAtEnd,
    });
  }
  console.log("Compiled same-root store owner execution PASS:", JSON.stringify(summaries));
} finally {
  try {
    for (const root of rootsToDispose) root.dispose();
    for (const { size, root, app } of cleanupRecords) {
      assert.equal(root.diagnostics().disposed, true, `${size} rows: generated root was not disposed during final cleanup`);
      assert.equal(app.rows.stats().readerCount, 0, `${size} rows: collection reader survived final cleanup`);
      assert.deepEqual(
        app.source.diagnostics(),
        { roots: 0, listeners: 0, readers: 0, retainedActions: 0, transitions: 0 },
        `${size} rows: store survived final cleanup`,
      );
    }
  } finally {
    for (const outputPath of outputsToRemove) {
      try {
        await unlink(outputPath);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
    plugin.closeBundle?.call({});
  }
}
