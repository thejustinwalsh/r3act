import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { nativeModulePlugin } from "./vite_native_plugin.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceId = path.join(projectRoot, ".cache/native-collection-differential.tsx");
const outputPath = path.join(projectRoot, ".cache/native-collection-differential.mjs");
const plugin = nativeModulePlugin({ root: projectRoot });
plugin.configResolved?.call({}, { root: projectRoot });

const source = `import { createKeyedCollection, createStore, use, useEffect, useState } from "../src/native_runtime_api.ts";

export const rows = createKeyedCollection([
  { id: "a", value: 1 }, { id: "b", value: 2 }, { id: "c", value: 3 },
  { id: "d", value: 4 }, { id: "e", value: 5 },
], (item) => item.id);
export const fallbackRows = createKeyedCollection([
  { id: "fa", value: 10 }, { id: "fb", value: 20 },
], (item) => item.id);
export const sourceStore = createStore(100);
export const trace = {
  rowRenders: 0,
  mounts: 0,
  cleanups: 0,
  mountCounts: Object.create(null),
  cleanupCounts: Object.create(null),
  setters: Object.create(null),
  probeRenders: 0,
  fallbackOwnerRenders: 0,
  filterRenders: 0,
  filterMounts: 0,
  filterCleanups: 0,
  filterMountCounts: Object.create(null),
  filterCleanupCounts: Object.create(null),
  filterSetters: Object.create(null),
  filterOwnerRenders: 0,
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
    onClick={() => setLocal((value) => value + 1)}>{item.id}:{item.value}:{local}</li>;
}

export function StoreProbe() {
  trace.probeRenders++;
  const value = use(sourceStore);
  return <output data-source={value}>source:{value}</output>;
}

export function App() {
  return <section><StoreProbe /><ul>{rows.map((item) => <Row key={item.id} item={item} />)}</ul></section>;
}

export function FallbackRow({ item }) {
  return <li data-fallback-row={item.id}>{item.value}</li>;
}

export function FallbackApp() {
  trace.fallbackOwnerRenders++;
  return <section><output data-fallback-count={fallbackRows.size}>{fallbackRows.size}</output>
    <ul>{fallbackRows.map((item) => <FallbackRow key={item.id} item={item} />)}</ul></section>;
}

export const filterItems = [
  { id: "fi0", value: 1 }, { id: "fi1", value: 2 }, { id: "fi2", value: 3 },
  { id: "fi3", value: 4 }, { id: "fi4", value: 5 },
];
export function FilterRow({ item }) {
  trace.filterRenders++;
  const [local, setLocal] = useState(0);
  trace.filterSetters[item.id] = setLocal;
  useEffect(() => {
    trace.filterMounts++;
    trace.filterMountCounts[item.id] = (trace.filterMountCounts[item.id] || 0) + 1;
    return () => {
      trace.filterCleanups++;
      trace.filterCleanupCounts[item.id] = (trace.filterCleanupCounts[item.id] || 0) + 1;
    };
  });
  return <li data-filter-row={item.id} data-filter-value={item.value} data-filter-local={local}
    onClick={() => setLocal((value) => value + 1)}>{item.id}:{item.value}:{local}</li>;
}

export function FilterApp() {
  const [evenOnly, setEvenOnly] = useState(false);
  trace.filterOwnerRenders++;
  return <section><button data-filter-toggle="yes" onClick={() => setEvenOnly((value) => !value)}>{evenOnly ? "even" : "all"}</button>
    <ul>{filterItems.filter((item) => !evenOnly || item.value % 2 === 0).map((item) => <FilterRow key={item.id} item={item} />)}</ul></section>;
}`;

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

const seedRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
};
const pick = (random, values) => values[Math.floor(random() * values.length)];
const text = (node) => (node.text ?? "") + node.children.map(text).join("");
const walk = (node, predicate) => {
  if (predicate(node)) return node;
  for (const child of node.children) {
    const match = walk(child, predicate);
    if (match) return match;
  }
  return undefined;
};

let root;
let fallbackRoot;
let filterRoot;
try {
  const transformed = await plugin.transform.call(context, source, sourceId);
  assert.ok(transformed?.code, "composed native compiler did not transform the authored TSX");
  assert.match(transformed.code, /renderCollectionAt/, "keyed collection map was not compiler-lowered");
  assert.match(transformed.code, /__nativeBindStateProps?At\(/, "numeric row props were not compiler-bound");
  assert.match(transformed.code, /useStoreAt/, "authored use(store) was not compiler-lowered");
  assert.match(transformed.code, /requiresOwnerRender: true/, "extra collection-size read did not select the documented full-owner fallback");
  assert.doesNotMatch(source, /@native-ui|@jsx|\bjsx\s*[,}]/, "authored app must not use a marker, pragma, or factory import");

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, transformed.code);
  const app = await import(`${pathToFileURL(outputPath).href}?run=${Date.now()}`);

  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  root = createNativeRoot(host, container, { scheduleCommit() {} });
  root.mount(jsx(app.App, {}));
  const fallbackHost = new MemoryVDOMHost();
  const fallbackContainer = fallbackHost.createContainer();
  fallbackRoot = createNativeRoot(fallbackHost, fallbackContainer, { scheduleCommit() {} });
  fallbackRoot.mount(jsx(app.FallbackApp, {}));
  const filterHost = new MemoryVDOMHost();
  const filterContainer = filterHost.createContainer();
  filterRoot = createNativeRoot(filterHost, filterContainer, { scheduleCommit() {} });
  filterRoot.mount(jsx(app.FilterApp, {}));

  const row = (id) => walk(container, (node) => node.props["data-row"] === id);
  const rowsList = () => walk(container, (node) => node.tag === "ul");
  const sourceNode = () => walk(container, (node) => "data-source" in node.props);
  const filterList = () => walk(filterContainer, (node) => node.tag === "ul");
  const filterRow = (id) => walk(filterContainer, (node) => node.props["data-filter-row"] === id);
  const fallbackCount = () => walk(fallbackContainer, (node) => "data-fallback-count" in node.props);
  const fallbackRows = () => {
    const list = walk(fallbackContainer, (node) => node.tag === "ul");
    return list.children.map((node) => node.props["data-fallback-row"]);
  };
  const projected = new Map([
    ["a", 1], ["b", 2], ["c", 3], ["d", 4], ["e", 5],
  ]);
  const expectedOrder = [...projected.keys()];
  const assertProjection = (seed, step) => {
    const actualRows = rowsList().children;
    assert.deepEqual(actualRows.map((node) => node.props["data-row"]), expectedOrder, `seed ${seed} step ${step}: keyed order diverged`);
    for (const node of actualRows) {
      assert.equal(node.props["data-value"], projected.get(node.props["data-row"]), `seed ${seed} step ${step}: item value diverged`);
    }
  };

  assertProjection("initial", 0);
  assert.equal(app.trace.mounts, 5);
  assert.equal(fallbackCount().props["data-fallback-count"], 2);
  assert.deepEqual(fallbackRows(), ["fa", "fb"]);

  const mixedBeforeRows = new Map(expectedOrder.map((id) => [id, row(id)]));
  const mixedStateId = "b";
  const mixedStateNode = row(mixedStateId);
  app.trace.setters[mixedStateId](9);
  root.flush();
  assert.equal(mixedStateNode.props["data-local"], 9);
  const beforeMixedRowRenders = app.trace.rowRenders;
  const beforeMixedProbeRenders = app.trace.probeRenders;
  const mixedKey = "mixed-add";
  const mixedValue = 707;
  assert.equal(app.sourceStore.dispatch((value) => value + 7), true);
  assert.equal(app.rows.apply(app.rows.version, [{
    type: "insert",
    key: mixedKey,
    value: { id: mixedKey, value: mixedValue },
    beforeKey: "b",
  }]).ok, true);
  expectedOrder.splice(expectedOrder.indexOf("b"), 0, mixedKey);
  projected.set(mixedKey, mixedValue);
  // Publish the store write and the collection edit in one root flush.
  root.flush();
  const mixedRootRowRenders = app.trace.rowRenders - beforeMixedRowRenders;
  assert.equal(mixedRootRowRenders, 1, "same-root mixed update should execute only its inserted row");
  assertProjection("mixed", 0);
  for (const [id, node] of mixedBeforeRows) assert.equal(row(id), node, `mixed update replaced surviving host ${id}`);
  assert.equal(row(mixedStateId), mixedStateNode, "mixed update replaced the keyed local-state host");
  assert.equal(mixedStateNode.props["data-local"], 9, "mixed update lost keyed local state");
  assert.equal(sourceNode().props["data-source"], 107, "same-root use(store) source projection did not update");
  const mixedProbeRenders = app.trace.probeRenders - beforeMixedProbeRenders;
  assert.equal(mixedProbeRenders, 1, "same-root mixed update should execute its store reader once");

  const mixedSourceNode = sourceNode();
  const sourceBeforeIndependentUpdate = app.trace.probeRenders;
  const rowsBeforeIndependentUpdate = app.trace.rowRenders;
  app.sourceStore.dispatch((value) => value + 7);
  root.flush();
  assert.equal(sourceNode().props["data-source"], 114, "compiled use(store) source projection did not update");
  assert.equal(sourceNode(), mixedSourceNode, "store projection replaced its host node");
  const sameRootStoreProbeRenders = app.trace.probeRenders - sourceBeforeIndependentUpdate;
  assert.equal(sameRootStoreProbeRenders, 1, "store-only update should execute its reader once");
  const sameRootStoreRowRenders = app.trace.rowRenders - rowsBeforeIndependentUpdate;
  assert.equal(sameRootStoreRowRenders, 0, "store-only update should reuse unrelated row owners");

  const randomSeeds = [0x13579bdf, 0x2468ace0, 0x5eed1234, 0xc001d00d];
  let nextAdded = 0;
  let step = 0;
  let randomizedRowRenders = 0;
  for (const seed of randomSeeds) {
    const random = seedRandom(seed);
    // Pin a row-local owner state before randomized edits, then verify that
    // keyed identity and state survive moves and same-key item replacements.
    const statefulId = pick(random, expectedOrder);
    const statefulNode = row(statefulId);
    app.trace.setters[statefulId](9);
    root.flush();
    assert.equal(row(statefulId), statefulNode);
    assert.equal(statefulNode.props["data-local"], 9);

    for (let iteration = 0; iteration < 20; iteration++) {
      const currentKeys = [...expectedOrder];
      const kinds = ["insert", "remove", "move", "replace"];
      let kind = pick(random, kinds);
      if (kind === "remove" && currentKeys.length <= 3) kind = "insert";
      if (kind === "move" && currentKeys.length < 2) kind = "insert";

      let operation;
      let removedKey;
      if (kind === "insert") {
        const key = `s${seed.toString(16)}-${nextAdded++}`;
        const value = Math.floor(random() * 10000);
        const beforeKey = random() < 0.25 ? null : pick(random, currentKeys);
        operation = { type: "insert", key, value: { id: key, value }, beforeKey };
        const at = beforeKey === null ? expectedOrder.length : expectedOrder.indexOf(beforeKey);
        expectedOrder.splice(at, 0, key);
        projected.set(key, value);
      } else if (kind === "remove") {
        removedKey = pick(random, currentKeys);
        operation = { type: "remove", key: removedKey };
        expectedOrder.splice(expectedOrder.indexOf(removedKey), 1);
        projected.delete(removedKey);
      } else if (kind === "move") {
        const key = pick(random, currentKeys);
        const anchors = currentKeys.filter((candidate) => candidate !== key);
        const beforeKey = random() < 0.25 ? null : pick(random, anchors);
        operation = { type: "move", key, beforeKey };
        expectedOrder.splice(expectedOrder.indexOf(key), 1);
        const at = beforeKey === null ? expectedOrder.length : expectedOrder.indexOf(beforeKey);
        expectedOrder.splice(at, 0, key);
      } else {
        const key = pick(random, currentKeys);
        const value = Math.floor(random() * 10000);
        operation = { type: "replace", key, value: { id: key, value } };
        projected.set(key, value);
      }

      const survivorIds = currentKeys.filter((key) => key !== removedKey);
      const survivors = new Map(survivorIds.map((key) => [key, row(key)]));
      const beforeRenders = app.trace.rowRenders;
      assert.equal(app.rows.apply(app.rows.version, [operation]).ok, true, `seed ${seed} step ${iteration}: operation rejected`);
      root.flush();
      step++;
      const rowRenderDelta = app.trace.rowRenders - beforeRenders;
      randomizedRowRenders += rowRenderDelta;
      assert.equal(rowRenderDelta, kind === "insert" || kind === "replace" ? 1 : 0,
        `seed ${seed} step ${iteration}: ${kind} re-executed unrelated row owners`);
      assertProjection(seed, iteration);
      for (const [key, node] of survivors) {
        assert.equal(row(key), node, `seed ${seed} step ${iteration}: survivor ${key} lost host identity`);
      }
      if (removedKey !== undefined) {
        assert.equal(row(removedKey), undefined, `seed ${seed} step ${iteration}: removed row remains mounted`);
        assert.equal(app.trace.cleanupCounts[removedKey], app.trace.mountCounts[removedKey], `seed ${seed} step ${iteration}: removed row cleanup count mismatch`);
      }
      if (projected.has(statefulId)) {
        assert.equal(row(statefulId), statefulNode, `seed ${seed} step ${iteration}: keyed owner host identity changed`);
        assert.equal(statefulNode.props["data-local"], 9, `seed ${seed} step ${iteration}: keyed owner state was lost`);
      }
      assert.equal(app.trace.mounts - app.trace.cleanups, expectedOrder.length, `seed ${seed} step ${iteration}: effect lifetime count diverged from projection`);
    }
  }

  const fallbackBefore = app.trace.fallbackOwnerRenders;
  const fallbackProjection = new Map([["fa", 10], ["fb", 20]]);
  const fallbackOperations = [
    { type: "insert", key: "fc", value: { id: "fc", value: 30 }, beforeKey: "fb" },
    { type: "replace", key: "fa", value: { id: "fa", value: 11 } },
    { type: "move", key: "fc", beforeKey: null },
    { type: "remove", key: "fb" },
  ];
  const fallbackOrder = ["fa", "fb"];
  for (const [index, operation] of fallbackOperations.entries()) {
    if (operation.type === "insert") {
      fallbackProjection.set(operation.key, operation.value.value);
      fallbackOrder.splice(fallbackOrder.indexOf(operation.beforeKey), 0, operation.key);
    } else if (operation.type === "replace") {
      fallbackProjection.set(operation.key, operation.value.value);
    } else if (operation.type === "move") {
      fallbackOrder.splice(fallbackOrder.indexOf(operation.key), 1);
      fallbackOrder.push(operation.key);
    } else {
      fallbackProjection.delete(operation.key);
      fallbackOrder.splice(fallbackOrder.indexOf(operation.key), 1);
    }
    assert.equal(app.fallbackRows.apply(app.fallbackRows.version, [operation]).ok, true);
    fallbackRoot.flush();
    assert.equal(fallbackRows().join(","), fallbackOrder.join(","), `fallback step ${index}: order diverged`);
    assert.equal(fallbackCount().props["data-fallback-count"], fallbackProjection.size, `fallback step ${index}: parent collection read stale`);
    for (const node of walk(fallbackContainer, (candidate) => candidate.tag === "ul").children) {
      assert.equal(Number(text(node)), fallbackProjection.get(node.props["data-fallback-row"]), `fallback step ${index}: row value diverged`);
    }
  }
  assert.ok(app.trace.fallbackOwnerRenders > fallbackBefore, "collection-size dependency did not exercise full-owner fallback");

  const filterAllIds = ["fi0", "fi1", "fi2", "fi3", "fi4"];
  const filterEvenIds = ["fi1", "fi3"];
  const filterInitialNodes = new Map(filterAllIds.map((id) => [id, filterRow(id)]));
  assert.deepEqual(filterList().children.map((node) => node.props["data-filter-row"]), filterAllIds);
  assert.equal(app.trace.filterMounts, filterAllIds.length);
  app.trace.filterSetters.fi1(6);
  filterRoot.flush();
  const keptEvenNode = filterRow("fi1");
  assert.equal(keptEvenNode.props["data-filter-local"], 6);
  const filterRendersBefore = app.trace.filterOwnerRenders;
  walk(filterContainer, (node) => node.props["data-filter-toggle"] === "yes").props.onClick();
  filterRoot.flush();
  assert.ok(app.trace.filterOwnerRenders > filterRendersBefore, "generic filter owner did not rerender when its state changed");
  assert.deepEqual(filterList().children.map((node) => node.props["data-filter-row"]), filterEvenIds, "filter fallback membership diverged");
  for (const id of filterEvenIds) assert.equal(filterRow(id), filterInitialNodes.get(id), `filtered survivor ${id} lost keyed host identity`);
  for (const id of ["fi0", "fi2", "fi4"]) {
    assert.equal(filterRow(id), undefined, `filtered row ${id} remained mounted`);
    assert.equal(app.trace.filterCleanupCounts[id], 1, `filtered row ${id} did not clean up once`);
  }
  assert.equal(keptEvenNode.props["data-filter-local"], 6, "filter fallback lost a surviving row's local owner state");
  walk(filterContainer, (node) => node.props["data-filter-toggle"] === "yes").props.onClick();
  filterRoot.flush();
  assert.deepEqual(filterList().children.map((node) => node.props["data-filter-row"]), filterAllIds, "cleared filter did not restore the full projection");
  for (const id of filterEvenIds) assert.equal(filterRow(id), filterInitialNodes.get(id), `filter clear replaced retained row ${id}`);
  for (const id of ["fi0", "fi2", "fi4"]) {
    assert.notEqual(filterRow(id), filterInitialNodes.get(id), `filtered row ${id} incorrectly retained its removed host`);
    assert.equal(filterRow(id).props["data-filter-local"], 0, `remounted row ${id} retained dead owner state`);
  }

  root.dispose();
  fallbackRoot.dispose();
  filterRoot.dispose();
  assert.equal(app.trace.mounts, app.trace.cleanups, "root disposal did not clean every row effect exactly once");
  for (const [id, mountCount] of Object.entries(app.trace.mountCounts)) {
    assert.equal(app.trace.cleanupCounts[id] ?? 0, mountCount, `row ${id} effect cleanup was not exact-once`);
  }
  const cleanupsAfterTeardown = app.trace.cleanups;
  root.dispose();
  fallbackRoot.dispose();
  filterRoot.dispose();
  assert.equal(app.trace.cleanups, cleanupsAfterTeardown, "repeated root disposal ran effect cleanup more than once");
  assert.equal(app.trace.filterMounts, app.trace.filterCleanups, "filter root teardown did not clean all filter-row effects");
  for (const [id, mountCount] of Object.entries(app.trace.filterMountCounts)) {
    assert.equal(app.trace.filterCleanupCounts[id] ?? 0, mountCount, `filter row ${id} effect cleanup was not exact-once`);
  }
  assert.equal(app.rows.stats().readerCount, 0, "optimized collection reader survived root teardown");
  assert.equal(app.fallbackRows.stats().readerCount, 0, "fallback collection reader survived root teardown");
  assert.deepEqual(
    app.sourceStore.diagnostics(),
    { roots: 0, listeners: 0, readers: 0, retainedActions: 0, transitions: 0 },
    "same-root source reader/subscription survived teardown",
  );
  console.log(`Native collection differential execution PASS: ${randomSeeds.length} deterministic seeds, ${step} keyed operations, projection parity, host/keyed-owner identity, mixed same-root store/collection flush (${mixedRootRowRenders} row and ${mixedProbeRenders} probe renders), later same-root store update (${sameRootStoreRowRenders} row and ${sameRootStoreProbeRenders} probe renders), seeded row work (${randomizedRowRenders} renders), generic filter fallback, explicit collection-size fallback, exact-once effects and reader teardown.`);
} finally {
  root?.dispose();
  fallbackRoot?.dispose();
  filterRoot?.dispose();
  plugin.closeBundle?.call({});
}
