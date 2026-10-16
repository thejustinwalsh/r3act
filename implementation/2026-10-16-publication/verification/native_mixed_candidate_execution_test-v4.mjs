import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import {
  MemoryVDOMHost,
  VDOMSnapshotRoot,
} from "../src/vdom_snapshot_runtime.ts";
import { nativeModulePlugin } from "./vite_native_plugin.ts";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const cacheDirectory = path.join(
  projectRoot,
  ".cache/publication-20261016-mixed-proof",
);
const sourceId = path.join(cacheDirectory, "authored-board.tsx");
const outputPath = path.join(cacheDirectory, "compiled-board.mjs");
const recordPath = path.join(cacheDirectory, "execution-proof.json");
const plugin = nativeModulePlugin({ root: projectRoot });
plugin.configResolved?.call({}, { root: projectRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier, importer) {
    if (specifier === "../../src/native_runtime_api.ts") {
      return { id: path.join(projectRoot, "src/native_runtime_api.ts") };
    }
    return null;
  },
  error(message) {
    throw new Error(String(message));
  },
};

const source =
  `import { createKeyedCollection, createStore, use, useEffect, useState } from "../../src/native_runtime_api.ts";

export const rows = createKeyedCollection([
  { id: "a", label: "Alpha" },
  { id: "b", label: "Beta" },
  { id: "c", label: "Gamma" },
], row => row.id);
export const shared = createStore(0);
export const trace = {
  renders: Object.create(null),
  controls: Object.create(null),
  mounts: [],
  cleanups: [],
  refObservations: [],
  storeObservations: [],
  storeRefObservations: [],
  effectObservations: [],
  watchedNode: null,
  probeNode: null,
};

export function Row({ row }) {
  trace.renders[row.id] = (trace.renders[row.id] || 0) + 1;
  const [x, setX] = useState(0);
  trace.controls[row.id] = { setX };
  const sourceValue = row.id === "a" ? use(shared) : null;
  useEffect(() => {
    trace.mounts.push(row.id);
    trace.effectObservations.push({
      id: row.id,
      watchedX: trace.watchedNode?.props["data-x"],
      probeValue: trace.probeNode?.props["data-source-probe"],
    });
    return () => trace.cleanups.push(row.id);
  });
  return <li ref={node => {
      if (node) trace.refObservations.push({
        id: row.id,
        watchedX: trace.watchedNode?.props["data-x"],
      });
    }} data-row={row.id} data-x={x} data-source={sourceValue ?? ""}
    data-label={row.label}>{row.label}</li>;
}

export function StoreProbe() {
  const value = use(shared);
  useEffect(() => {
    trace.storeObservations.push({
      value,
      watchedX: trace.watchedNode?.props["data-x"],
    });
  });
  return <output ref={node => {
      if (!node) return;
      trace.probeNode = node;
      trace.storeRefObservations.push({
        value: node.props["data-source-probe"],
        watchedX: trace.watchedNode?.props["data-x"],
      });
    }} data-source-probe={value}>shared:{value}</output>;
}

export function Board() {
  const [boardState] = useState("board");
  return <section data-board-state={boardState}>
    <StoreProbe />
    <ul>{rows.map(row => <Row key={row.id} row={row} />)}</ul>
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
const textContent = (node) =>
  (node.text ?? "") + node.children.map(textContent).join("");

let root;
let app;
let genericPrepareCommitCalls = 0;
const originalPrepareCommit = VDOMSnapshotRoot.prototype.prepareCommit;
try {
  await mkdir(cacheDirectory, { recursive: true });
  await writeFile(sourceId, source);
  const transformed = await plugin.transform.call(context, source, sourceId);
  assert.ok(
    transformed?.code,
    "Rust/OXC did not compile authored Board/Row TSX",
  );
  assert.match(
    transformed.code,
    /__nativeRenderCollectionAt\(/,
    "keyed collection was not compiler-certified",
  );
  assert.match(
    transformed.code,
    /__nativeBindStatePropAt\(/,
    "row state was not compiled into a numeric binding",
  );
  assert.match(
    transformed.code,
    /propOnlySites: \["[^"]*#component:Row#state:0"\]/,
    "numeric-only Row state was not compiler-certified for sparse publication",
  );
  assert.match(
    transformed.code,
    /__nativeUseAt\(/,
    "authored store reads were not lowered",
  );
  assert.doesNotMatch(
    source,
    /@native-ui|@jsx|propOnlySites|hostLeafOutput|bindStatePropAt/,
    "the test must use ordinary authored TSX without compiler metadata or author flags",
  );
  await writeFile(outputPath, transformed.code);
  app = await import(`${pathToFileURL(outputPath).href}?run=${Date.now()}`);

  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const profileFrames = [];
  root = createNativeRoot(host, container, {
    rootId: "native-mixed-candidate-execution",
    scheduleCommit() {},
    keyIndexMaintenance: "delta",
    profileCounter(frame) {
      profileFrames.push(frame);
    },
  });
  const find = (predicate) => walk(container, predicate);
  const list = () => find((node) => node.tag === "ul");
  const row = (id) => find((node) => node.props["data-row"] === id);
  const probe = () => find((node) => "data-source-probe" in node.props);
  root.mount(jsx(app.Board, {}));
  assert.deepEqual(list().children.map((node) => node.props["data-row"]), [
    "a",
    "b",
    "c",
  ]);
  assert.equal(app.trace.renders.a, 1);
  assert.equal(app.trace.renders.b, 1);
  assert.equal(app.trace.renders.c, 1);
  assert.equal(app.trace.mounts.length, 3);
  assert.equal(app.trace.storeObservations.at(-1).value, 0);
  assert.equal(app.rows.stats().readerCount, 1);
  assert.deepEqual(app.shared.diagnostics(), {
    roots: 1,
    listeners: 1,
    readers: 2,
    retainedActions: 0,
    transitions: 0,
  });

  const retainedA = row("a");
  const retainedB = row("b");
  const removedC = row("c");
  const beforeRenders = { ...app.trace.renders };
  const beforeEffects = app.trace.mounts.length;
  const beforeCleanups = app.trace.cleanups.length;
  app.trace.watchedNode = retainedB;
  app.trace.refObservations.length = 0;
  app.trace.storeObservations.length = 0;
  app.trace.storeRefObservations.length = 0;
  app.trace.effectObservations.length = 0;
  assert.equal(app.trace.controls.b.setX(7), true);
  assert.equal(app.shared.dispatch((previous) => previous + 1), true);
  assert.equal(
    app.rows.apply(app.rows.version, [
      {
        type: "insert",
        key: "d",
        value: { id: "d", label: "Delta" },
        beforeKey: "a",
      },
      {
        type: "replace",
        key: "d",
        value: { id: "d", label: "Delta revised" },
      },
      { type: "move", key: "d", beforeKey: null },
      { type: "remove", key: "c" },
    ]).ok,
    true,
  );

  VDOMSnapshotRoot.prototype.prepareCommit = function (..._args) {
    genericPrepareCommitCalls++;
    throw new Error("Mixed candidate entered generic full prepareCommit");
  };

  // A stale cut must be rejected before touching host state or acknowledging
  // collection/store/state work. A later setter advances the captured cell.
  const staleCandidate = root.preparePending();
  assert.ok(staleCandidate, "pending mixed work did not produce a candidate");
  assert.equal(staleCandidate.validate(), true);
  assert.equal(genericPrepareCommitCalls, 0);
  assert.equal(
    app.trace.mounts.length,
    beforeEffects,
    "candidate preparation ran effects",
  );
  assert.equal(row("b"), retainedB);
  assert.equal(retainedB.props["data-x"], 0);
  assert.equal(app.trace.cleanups.length, beforeCleanups);
  assert.equal(app.trace.refObservations.length, 0);
  assert.equal(app.trace.controls.b.setX(8), true);
  assert.equal(
    staleCandidate.validate(),
    false,
    "candidate stayed valid after a newer state version",
  );

  assert.throws(
    () => staleCandidate.commitHost(),
    /Native root candidate is stale/,
  );
  assert.equal(genericPrepareCommitCalls, 0);
  assert.equal(
    list().children.length,
    3,
    "stale candidate changed the mounted keyed rows",
  );
  assert.equal(row("b"), retainedB);
  assert.equal(retainedB.props["data-x"], 0);
  assert.equal(
    app.trace.mounts.length,
    beforeEffects,
    "stale candidate ran effects",
  );
  assert.equal(
    app.trace.cleanups.length,
    beforeCleanups,
    "stale candidate cleaned effects",
  );
  assert.equal(
    app.trace.refObservations.length,
    0,
    "stale candidate published refs",
  );
  assert.equal(
    app.rows.stats().retainedBatches,
    1,
    "stale candidate acknowledged its collection cut",
  );
  assert.equal(
    root.diagnostics().pendingChangeCount,
    1,
    "stale candidate acknowledged its state cut",
  );

  const candidate = root.preparePending();
  assert.ok(candidate, "pending work disappeared after stale rejection");
  assert.equal(candidate.validate(), true);
  assert.equal(
    app.trace.mounts.length,
    beforeEffects,
    "candidate preparation ran effects",
  );
  candidate.commitHost();
  assert.equal(
    genericPrepareCommitCalls,
    0,
    "candidate used the generic full commit path",
  );
  assert.deepEqual(list().children.map((node) => node.props["data-row"]), [
    "a",
    "b",
    "d",
  ]);
  assert.equal(row("a"), retainedA, "store reader lost retained host identity");
  assert.equal(
    row("b"),
    retainedB,
    "numeric-only row lost retained host identity",
  );
  assert.equal(row("c"), undefined, "removed row remained mounted");
  assert.equal(row("d").props["data-x"], 0);
  assert.equal(row("d").props["data-label"], "Delta revised");
  assert.equal(
    retainedB.props["data-x"],
    8,
    "numeric state did not join the host cut",
  );
  assert.equal(
    row("a").props["data-source"],
    1,
    "collection reader observed a different store cut",
  );
  assert.equal(
    probe().props["data-source-probe"],
    1,
    "outside store reader observed a different store cut",
  );
  assert.deepEqual(
    { ...app.trace.renders },
    {
      ...beforeRenders,
      a: beforeRenders.a + 2,
      d: 4,
    },
    "mixed candidate reran unrelated rows or skipped a store reader/new row",
  );
  assert.equal(
    app.trace.mounts.length,
    beforeEffects,
    "host phase ran effects before publication",
  );
  assert.equal(
    app.trace.refObservations.length,
    0,
    "host phase published refs before publication",
  );

  candidate.publish();
  assert.equal(
    root.diagnostics().pendingChangeCount,
    0,
    "published candidate did not acknowledge its captured state versions",
  );
  assert.equal(
    app.rows.stats().retainedBatches,
    0,
    "published candidate did not acknowledge its collection cut",
  );
  assert.equal(
    app.trace.mounts.length,
    beforeEffects,
    "publish ran effect setups early",
  );
  candidate.runEffects();

  assert.equal(genericPrepareCommitCalls, 0);
  assert.equal(
    app.trace.mounts.length,
    beforeEffects + 1,
    "insert did not activate exactly one new row effect",
  );
  assert.equal(
    app.trace.cleanups.length,
    beforeCleanups + 1,
    "remove did not clean exactly one row effect",
  );
  assert.ok(
    app.trace.cleanups.slice(beforeCleanups).includes("c"),
    "remove did not clean the removed row effect",
  );
  assert.ok(
    app.trace.mounts.slice(beforeEffects).includes("d"),
    "insert did not activate the new row effect",
  );
  const dRef = app.trace.refObservations.find((item) => item.id === "d");
  assert.deepEqual(
    dRef,
    { id: "d", watchedX: 8 },
    "new ref ran before numeric values were committed",
  );
  assert.deepEqual(app.trace.storeRefObservations.at(-1), {
    value: 1,
    watchedX: 8,
  }, "store reader ref did not observe the same store/numeric cut");
  assert.deepEqual(app.trace.effectObservations.at(-1), {
    id: "d",
    watchedX: 8,
    probeValue: 1,
  }, "new effect ran before numeric values and the store cut were committed");
  assert.equal(
    app.trace.renders.b,
    beforeRenders.b,
    "numeric direct writer re-executed an unrelated row",
  );
  assert.equal(textContent(probe()), "shared:1");
  assert.equal(
    root.preparePending(),
    null,
    "published candidate left already-acknowledged work queued",
  );

  const finalNumericValue = retainedB.props["data-x"];
  const finalStoreValue = probe().props["data-source-probe"];
  root.dispose();
  assert.equal(root.diagnostics().disposed, true);
  assert.equal(
    app.trace.mounts.length,
    app.trace.cleanups.length,
    "disposal left a row effect live",
  );
  assert.equal(app.rows.stats().readerCount, 0);
  assert.equal(app.rows.stats().retainedBatches, 0);
  assert.deepEqual(app.shared.diagnostics(), {
    roots: 0,
    listeners: 0,
    readers: 0,
    retainedActions: 0,
    transitions: 0,
  });
  const proof = {
    status: "PASS",
    runtime: process.version,
    authoredSource: path.relative(projectRoot, sourceId),
    emittedModule: path.relative(projectRoot, outputPath),
    proof:
      "ordinary Rust/OXC-authored TSX; prehost stale rejection; insert/replace/move/remove with numeric and shared-store updates; retained hosts; compiler-certified sparse numeric site; refs/effects observe committed numeric and store values; generic full-commit trap; disposal",
    genericPrepareCommitCalls,
    finalRows: ["a", "b", "d"],
    numericValue: finalNumericValue,
    storeValue: finalStoreValue,
    rowRenders: { ...app.trace.renders },
    mounts: app.trace.mounts.length,
    cleanups: app.trace.cleanups.length,
    disposed: root.diagnostics().disposed,
    storeDiagnostics: app.shared.diagnostics(),
    collectionStats: app.rows.stats(),
  };
  await writeFile(recordPath, JSON.stringify(proof, null, 2) + "\n");
  console.log(
    "Mixed candidate execution PASS:",
    JSON.stringify(proof),
  );
} finally {
  VDOMSnapshotRoot.prototype.prepareCommit = originalPrepareCommit;
  try {
    root?.dispose();
  } finally {
    plugin.closeBundle?.call({});
  }
}
