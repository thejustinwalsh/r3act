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
export const primary = createStore(10);
export const alternate = createStore(20);
export const refs = { a: null, b: null, aAttaches: 0, bAttaches: 0, aDetaches: 0, bDetaches: 0 };
export const trace = {
  rowRenders: 0,
  probeARenders: 0,
  probeBRenders: 0,
  nestedRenders: 0,
  rowMounts: 0,
  rowCleanups: 0,
  nestedSetups: 0,
  nestedCleanups: 0,
  nestedObservations: [],
  rowSetters: Object.create(null),
  rowMountCounts: Object.create(null),
  rowCleanupCounts: Object.create(null),
  setAStore: null,
  setATick: null,
  setNested: null,
};
export function captureA(node) {
  if (node == null) return;
  refs.a = node;
  refs.aAttaches++;
  return () => { refs.aDetaches++; if (refs.a === node) refs.a = null; };
}
export function captureB(node) {
  if (node == null) return;
  refs.b = node;
  refs.bAttaches++;
  return () => { refs.bDetaches++; if (refs.b === node) refs.b = null; };
}
export function Row({ row }) {
  trace.rowRenders++;
  const [local, setLocal] = useState(0);
  trace.rowSetters[row.id] = setLocal;
  useEffect(() => {
    trace.rowMounts++;
    trace.rowMountCounts[row.id] = (trace.rowMountCounts[row.id] || 0) + 1;
    return () => {
      trace.rowCleanups++;
      trace.rowCleanupCounts[row.id] = (trace.rowCleanupCounts[row.id] || 0) + 1;
    };
  });
  return <li data-row={row.id} data-label={row.label} data-local={local}>{row.label}:{local}</li>;
}
export function ProbeA() {
  trace.probeARenders++;
  const [useAlternate, setUseAlternate] = useState(false);
  const [tick, setTick] = useState(0);
  trace.setAStore = setUseAlternate;
  trace.setATick = setTick;
  const value = use(useAlternate ? alternate : primary);
  return <output ref={captureA} data-reader="a" data-value={value} data-tick={tick}
    style={{ left: \`\${value + tick}px\`, opacity: value / 100 }} />;
}
export function ProbeB() {
  trace.probeBRenders++;
  const value = use(alternate);
  return <output ref={captureB} data-reader="b" data-value={value}>{value}</output>;
}
export function NestedProbe() {
  trace.nestedRenders++;
  const value = use(primary);
  useEffect(() => {
    trace.nestedSetups++;
    trace.nestedObservations.push({
      value,
      a: refs.a?.props["data-value"],
      aTick: refs.a?.props["data-tick"],
      b: refs.b?.props["data-value"],
    });
    return () => { trace.nestedCleanups++; };
  });
  return <div data-nested="wrapper"><output data-nested-value={value}>{value}</output></div>;
}
export function App() {
  const [showNested, setShowNested] = useState(false);
  trace.setNested = setShowNested;
  return <section>
    <ProbeA key="probe-a" />
    <ProbeB key="probe-b" />
    {showNested ? <NestedProbe key="nested" /> : null}
    <ul>{rows.map((row) => <Row key={row.id} row={row} />)}</ul>
  </section>;
}`;

const walk = (node, predicate) => {
  if (predicate(node)) return node;
  for (const child of node.children) {
    const found = walk(child, predicate);
    if (found) return found;
  }
  return undefined;
};
const sizes = [1_000, 10_000, 50_000];
const summaries = [];
const roots = [];
const cleanupRecords = [];
const outputsToRemove = [];
const assertSparseCounters = (stage, counters) => {
  const expected = {
    "store.sparse.live-reader-selection-visits": 2,
    "store.reader-owners-selected": 2,
    "store.sparse.eligibility-owner-visits": 2,
    "store.sparse.reader-cache-lookups": 2,
    "store.sparse.eligibility-tree-node-visits": 6,
    "owner.component-visits": 2,
    "owner.component-renders": 2,
    "store.sparse.output-tree-node-visits": 8,
    "store.sparse.reader-owner-renders": 2,
    "store.sparse.ancestor-owner-visits": 4,
    "vdom.prepared-keyed-regions.validation-node-visits": 3,
    "vdom.prepared-keyed-regions.old-subtree-visits": 3,
    "vdom.prepared-keyed-regions.new-candidate-key-visits": 3,
    "store.sparse.reader-publication-map-visits": 4,
    "store.sparse.subscription-reader-visits": 2,
    "store.sparse.cache-patch-writes": 2,
    "store.sparse.keyed-output-edge-visits": 2,
    "store.sparse.source-history-owner-visits": 2,
    "store.sparse.effect-owner-visits": 2,
  };
  for (const [counter, value] of Object.entries(expected)) {
    assert.equal(counters[counter] ?? 0, value, `${stage}: ${counter} was not bounded at ${value}`);
  }
};
try {
  await mkdir(cacheDirectory, { recursive: true });
  for (const size of sizes) {
    const stem = `native-sparse-store-${size}`;
    const sourceId = path.join(cacheDirectory, `${stem}.tsx`);
    const outputPath = path.join(cacheDirectory, `${stem}.mjs`);
    outputsToRemove.push(outputPath);
    const transformed = await plugin.transform.call(context, makeSource(size), sourceId);
    assert.ok(transformed?.code, `nativeModulePlugin did not compile the ${size}-row TSX module`);
    assert.match(transformed.code, /renderCollectionAt/, "keyed row collection was not compiler-lowered");
    assert.match(transformed.code, /__nativeBindStateProps?At\(/, "numeric row/reader props were not compiler-bound");
    assert.match(transformed.code, /useStoreAt/, "authored use(store) was not compiler-lowered");
    assert.doesNotMatch(makeSource(size), /@native-ui|@jsx|\bjsx\s*[,}]/, "authored TSX used a marker, pragma, or factory import");
    await writeFile(outputPath, transformed.code);
    const app = await import(`${pathToFileURL(outputPath).href}?size=${size}&run=${Date.now()}`);

    const host = new MemoryVDOMHost();
    const container = host.createContainer();
    let profileCounters = {};
    const root = createNativeRoot(host, container, {
      scheduleCommit() {},
      profileCounter(next) { profileCounters = { ...profileCounters, ...next }; },
    });
    roots.push(root);
    cleanupRecords.push({ size, root, app });
    root.mount(jsx(app.App, {}));

    const list = () => walk(container, (node) => node.tag === "ul");
    const probe = (id) => walk(container, (node) => node.props["data-reader"] === id);
    const nestedValue = () => walk(container, (node) => "data-nested-value" in node.props);
    const rowMap = () => new Map(list().children.map((node) => [node.props["data-row"], node]));
    const order = Array.from({ length: size }, (_, index) => String(index));
    const labels = new Map(order.map((id, index) => [id, `row-${index}`]));
    const assertProjection = (stage) => {
      const nodes = list().children;
      assert.equal(nodes.length, order.length, `${size} rows ${stage}: membership count mismatch`);
      assert.deepEqual(nodes.map((node) => node.props["data-row"]), order, `${size} rows ${stage}: order mismatch`);
      for (const node of nodes) {
        const id = node.props["data-row"];
        assert.equal(node.props["data-label"], labels.get(id), `${size} rows ${stage}: label mismatch for ${id}`);
      }
    };
    assertProjection("initial");
    assert.equal(app.trace.rowRenders, size);
    assert.equal(app.trace.probeARenders, 1);
    assert.equal(app.trace.probeBRenders, 1);
    assert.equal(app.trace.rowMounts, size);
    assert.equal(probe("a").props["data-value"], 10);
    assert.equal(probe("b").props["data-value"], 20);
    assert.equal(app.refs.a, probe("a"));
    assert.equal(app.refs.b, probe("b"));
    const probeAHost = app.refs.a;
    const probeBHost = app.refs.b;

    const statefulId = String(Math.floor(size / 2));
    const beforeSparse = rowMap();
    const retained = beforeSparse.get(statefulId);
    app.trace.rowSetters[statefulId](5);
    root.flush();
    assert.equal(rowMap().get(statefulId), retained, `${size} rows: keyed local-state update replaced its host`);
    assert.equal(retained.props["data-local"], 5);

    // Two disjoint leaf readers subscribe to different stores. A primary-store
    // transaction must refresh every reader owner, including unchanged B.
    const rowsBeforeStore = app.trace.rowRenders;
    const aBeforeStore = app.trace.probeARenders;
    const bBeforeStore = app.trace.probeBRenders;
    profileCounters = {};
    assert.equal(app.primary.dispatch((value) => value + 1), true);
    root.flush();
    const storeCounters = { ...profileCounters };
    assertSparseCounters(`${size}: primary store update`, storeCounters);
    assert.equal(app.trace.rowRenders - rowsBeforeStore, 0, `${size} rows: store-only update rendered unrelated rows`);
    assert.equal(app.trace.probeARenders - aBeforeStore, 1, `${size}: changed-store reader did not render once`);
    assert.equal(app.trace.probeBRenders - bBeforeStore, 1, `${size}: unchanged-store reader was not refreshed`);
    assert.equal(probe("a").props["data-value"], 11);
    assert.equal(probe("a").props.style.left, "11px");
    assert.equal(probe("a").props.style.opacity, 0.11);
    assert.equal(probe("b").props["data-value"], 20, "unchanged reader lost its selected store value");
    assert.equal(app.refs.a, probeAHost, `${size}: store update replaced reader A host`);
    assert.equal(app.refs.b, probeBHost, `${size}: store update replaced reader B host`);
    const afterStoreNodes = rowMap();
    for (const [id, node] of beforeSparse) assert.equal(afterStoreNodes.get(id), node, `${size}: sparse store update replaced row ${id}`);
    assert.equal(retained.props["data-local"], 5, `${size}: sparse store update lost row-local state`);

    // Switch A's store selector, then verify the old source no longer has any
    // interested reader while the new source refreshes all of its readers.
    const switchRenderA = app.trace.probeARenders;
    profileCounters = {};
    assert.equal(app.trace.setAStore(true), true);
    root.flush();
    const sourceSwitchCounters = { ...profileCounters };
    assertSparseCounters(`${size}: selector source switch`, sourceSwitchCounters);
    assert.equal(app.trace.probeARenders - switchRenderA, 1, `${size}: source switch did not render A once`);
    assert.equal(probe("a").props["data-value"], 20);
    assert.equal(app.refs.a, probeAHost, `${size}: source switch replaced reader A host`);
    const oldSourceRenderA = app.trace.probeARenders;
    const oldSourceRenderB = app.trace.probeBRenders;
    profileCounters = {};
    assert.equal(app.primary.dispatch((value) => value + 1), true);
    root.flush();
    const staleSourceCounters = { ...profileCounters };
    assert.deepEqual(staleSourceCounters, {}, `${size}: deselected source still triggered work`);
    assert.equal(app.trace.probeARenders - oldSourceRenderA, 0, `${size}: stale primary subscription still notified A`);
    assert.equal(app.trace.probeBRenders - oldSourceRenderB, 0, `${size}: unrelated source notified B`);
    assert.equal(probe("a").props["data-value"], 20, `${size}: stale primary subscription still changed A`);
    assert.equal(probe("b").props["data-value"], 20);
    const switchedA = app.trace.probeARenders;
    profileCounters = {};
    assert.equal(app.alternate.dispatch((value) => value + 1), true);
    root.flush();
    const alternateCounters = { ...profileCounters };
    assert.equal(app.trace.probeARenders - switchedA, 1, `${size}: selected source did not refresh A`);
    assert.equal(probe("a").props["data-value"], 21);
    assert.equal(probe("b").props["data-value"], 21);
    assert.equal(app.refs.a, probeAHost, `${size}: selected source update replaced reader A host`);
    assert.equal(app.refs.b, probeBHost, `${size}: selected source update replaced reader B host`);
    assertSparseCounters(`${size}: selected-source update after switch`, alternateCounters);

    // A numeric state write and a store dispatch share one flush. Reader A's
    // direct bound props and both store projections must be coherent.
    const rowsBeforeMixed = app.trace.rowRenders;
    const aBeforeMixed = app.trace.probeARenders;
    const bBeforeMixed = app.trace.probeBRenders;
    profileCounters = {};
    assert.equal(app.trace.setATick(3), true);
    assert.equal(app.alternate.dispatch((value) => value + 1), true);
    root.flush();
    const mixedCounters = { ...profileCounters };
    assertSparseCounters(`${size}: mixed numeric/store update`, mixedCounters);
    assert.equal(app.trace.rowRenders - rowsBeforeMixed, 0, `${size}: mixed numeric/store update rendered unrelated rows`);
    assert.equal(app.trace.probeARenders - aBeforeMixed, 1, `${size}: mixed update did not deduplicate A`);
    assert.equal(app.trace.probeBRenders - bBeforeMixed, 1, `${size}: mixed update did not refresh B`);
    assert.equal(probe("a").props["data-value"], 22);
    assert.equal(probe("a").props["data-tick"], 3);
    assert.equal(probe("a").props.style.left, "25px");
    assert.equal(probe("a").props.style.opacity, 0.22);
    assert.equal(probe("b").props["data-value"], 22);
    assert.equal(app.refs.a, probeAHost, `${size}: mixed update replaced reader A host`);
    assert.equal(app.refs.b, probeBHost, `${size}: mixed update replaced reader B host`);

    // Nested store readers are outside sparse eligibility. Mount one in the
    // same store transaction and require generic fallback semantics and fresh
    // mount-effect observations.
    const rowsBeforeNested = app.trace.rowRenders;
    profileCounters = {};
    assert.equal(app.trace.setNested(true), true);
    assert.equal(app.primary.dispatch((value) => value + 1), true);
    root.flush();
    const nestedFallbackCounters = { ...profileCounters };
    assert.equal(app.trace.rowRenders - rowsBeforeNested, 0, `${size}: nested fallback changed unrelated row render counts`);
    assert.equal(nestedValue().props["data-nested-value"], 13);
    assert.equal(app.trace.nestedSetups, 1);
    assert.equal(app.trace.nestedCleanups, 0);
    assert.deepEqual(app.trace.nestedObservations[0], { value: 13, a: 22, aTick: 3, b: 22 }, `${size}: new nested effect saw stale sibling props`);
    assert.ok(nestedFallbackCounters["owner.component-renders"] >= 1, `${size}: structural store fallback did no owner rendering`);
    assert.ok(
      (nestedFallbackCounters["owner.component-visits"] ?? 0) >= size,
      `${size}: nested structural reader did not expose the full generic owner traversal`,
    );

    // A generic keyed row delta after sparse transactions must still consume
    // the collection history correctly and preserve unaffected owners.
    const rowBeforeDelta = rowMap();
    const rendersBeforeInsert = app.trace.rowRenders;
    const inserted = { id: "sparse-added", label: "added after sparse store work" };
    assert.equal(app.rows.apply(app.rows.version, [{ type: "insert", key: inserted.id, value: inserted, beforeKey: statefulId }]).ok, true);
    order.splice(order.indexOf(statefulId), 0, inserted.id);
    labels.set(inserted.id, inserted.label);
    root.flush();
    assert.equal(app.trace.rowRenders - rendersBeforeInsert, 1, `${size}: post-sparse insert did not render just the new row`);
    const afterInsert = rowMap();
    for (const [id, node] of rowBeforeDelta) assert.equal(afterInsert.get(id), node, `${size}: post-sparse insert replaced row ${id}`);
    assertProjection("post-sparse insert");
    assert.equal(retained.props["data-local"], 5);

    const removeNode = afterInsert.get("3");
    assert.equal(app.rows.apply(app.rows.version, [{ type: "remove", key: "3" }]).ok, true);
    order.splice(order.indexOf("3"), 1);
    labels.delete("3");
    root.flush();
    assert.equal(rowMap().has("3"), false);
    assert.equal(removeNode.parent, null);
    assert.equal(app.trace.rowCleanupCounts["3"], 1, `${size}: removed row effect did not clean once`);
    assertProjection("post-sparse remove");

    const nodeBeforeTeardown = rowMap();
    root.dispose();
    assert.equal(root.diagnostics().disposed, true);
    assert.equal(app.trace.rowMounts, app.trace.rowCleanups, `${size}: row effect teardown did not balance`);
    for (const [id, count] of Object.entries(app.trace.rowMountCounts)) {
      assert.equal(app.trace.rowCleanupCounts[id] ?? 0, count, `${size}: effect cleanup mismatch for ${id}`);
    }
    assert.equal(app.trace.nestedSetups, app.trace.nestedCleanups, `${size}: nested reader effect cleanup did not balance`);
    assert.equal(app.refs.a, null, `${size}: reader A ref survived root teardown`);
    assert.equal(app.refs.b, null, `${size}: reader B ref survived root teardown`);
    assert.equal(app.refs.aAttaches, 1);
    assert.equal(app.refs.bAttaches, 1);
    assert.equal(app.refs.aDetaches, 1);
    assert.equal(app.refs.bDetaches, 1);
    assert.equal(app.rows.stats().readerCount, 0);
    assert.equal(app.rows.stats().retainedBatches, 0);
    assert.deepEqual(app.primary.diagnostics(), { roots: 0, listeners: 0, readers: 0, retainedActions: 0, transitions: 0 });
    assert.deepEqual(app.alternate.diagnostics(), { roots: 0, listeners: 0, readers: 0, retainedActions: 0, transitions: 0 });
    summaries.push({
      size,
      storeCounters,
      sourceSwitchCounters,
      staleSourceCounters,
      alternateCounters,
      mixedCounters,
      nestedFallbackCounters,
      initialRowRenders: size,
      storeOnlyRowRenders: 0,
      readerRenderDeltas: { a: app.trace.probeARenders, b: app.trace.probeBRenders },
      finalRows: order.length,
      disposedNodesChecked: nodeBeforeTeardown.size,
    });
  }
  console.log("Compiled sparse store semantics PASS:", JSON.stringify(summaries));
} finally {
  try {
    for (const root of roots) root.dispose();
    for (const { size, root, app } of cleanupRecords) {
      assert.equal(root.diagnostics().disposed, true, `${size}: root was not disposed during cleanup`);
      assert.equal(app.rows.stats().readerCount, 0, `${size}: collection reader survived cleanup`);
      assert.deepEqual(app.primary.diagnostics(), { roots: 0, listeners: 0, readers: 0, retainedActions: 0, transitions: 0 });
      assert.deepEqual(app.alternate.diagnostics(), { roots: 0, listeners: 0, readers: 0, retainedActions: 0, transitions: 0 });
    }
  } finally {
    for (const outputPath of outputsToRemove) {
      try { await unlink(outputPath); } catch (error) { if (error?.code !== "ENOENT") throw error; }
    }
    plugin.closeBundle?.call({});
  }
}
