import assert from "node:assert/strict";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createNativeRoot, jsx, createKeyedCollection } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { nativeModulePlugin } from "./vite_native_plugin.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDirectory = path.join(projectRoot, ".cache");
const sourceId = path.join(cacheDirectory, "native-direct-writers.tsx");
const outputPath = path.join(cacheDirectory, "native-direct-writers.mjs");
const plugin = nativeModulePlugin({ root: projectRoot });
plugin.configResolved?.call({}, { root: projectRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier, importer) {
    if (specifier === "../src/native_runtime_api.ts") return { id: path.resolve(path.dirname(importer), specifier) };
    return null;
  },
  error(message) { throw new Error(String(message)); },
};

const source = `import { createStore, createKeyedCollection, use, useEffect, useState } from "../src/native_runtime_api.ts";
export const rows = createKeyedCollection([], row => row.id);
export const version = createStore(0);
export const trace = { renders: {}, controls: {}, attached: {}, detached: {}, observations: [], observerRenders: 0, observerSetups: 0, observerCleanups: 0 };
export function captureRow(id, node) {
  if (node == null) return;
  trace.attached[id] = (trace.attached[id] ?? 0) + 1;
  return () => { trace.detached[id] = (trace.detached[id] ?? 0) + 1; };
}
export function Row({ row }) {
  trace.renders[row.id] = (trace.renders[row.id] ?? 0) + 1;
  const [x, setX] = useState(1);
  const [y, setY] = useState(2);
  const [rotation, setRotation] = useState(3);
  trace.controls[row.id] = { setX, setY, setRotation };
  useEffect(() => () => { if (trace.controls[row.id]?.setX === setX) delete trace.controls[row.id]; });
  return <i ref={node => captureRow(row.id, node)} data-row={row.id}
    style={{ left: \`\${x}px\`, top: \`\${y}px\`, transform: \`rotate(\${rotation}deg)\`, color: "navy" }} />;
}
export function Board() {
  const [showObserver, setShowObserver] = useState(false);
  trace.setShowObserver = setShowObserver;
  return <section><output data-store={use(version)} />
    {showObserver ? <Observer key="observer" /> : null}
    <ul>{rows.map(row => <Row key={row.id} row={row} />)}</ul>
  </section>;
}
export function Observer() {
  trace.observerRenders++;
  const current = use(version);
  useEffect(() => {
    trace.observerSetups++;
    const node = trace.observationNode;
    trace.observations.push({ current, left: node?.props.style?.left, top: node?.props.style?.top, transform: node?.props.style?.transform });
    return () => { trace.observerCleanups++; };
  });
  return <output data-observer={current} />;
}`;

let root;
let app;
let trackingHost;
const counterEvents = [];
try {
  await mkdir(cacheDirectory, { recursive: true });
  const transformed = await plugin.transform.call(context, source, sourceId);
  assert.ok(transformed?.code, "nativeModulePlugin did not compile authored TSX");
  assert.match(transformed.code, /__nativeBindStatePropAt\(/, "authored scalar values were not compiled into direct writers");
  assert.match(transformed.code, /__nativeRenderCollectionAt\(/, "keyed collection was not compiler-lowered");
  for (let state = 0; state < 3; state++) {
    assert.match(transformed.code, new RegExp(`#component:Row#state:${state}`), `Row state ${state} is absent from emitted binding metadata`);
  }
  assert.doesNotMatch(source, /@native-ui|@jsx|\bjsx\s*[,}]/, "authored TSX must not use a marker, pragma, or factory import");
  await writeFile(outputPath, transformed.code);
  app = await import(`${pathToFileURL(outputPath).href}?run=${Date.now()}`);

  class TrackingHost extends MemoryVDOMHost {
    tracked = new Set();
    writes = [];
    setProp(node, name, value, previous) {
      if (this.tracked.has(node) && name === "style") this.writes.push({ kind: "style-aggregate", value });
      super.setProp(node, name, value, previous);
    }
    setStyleProp(node, name, value) {
      if (this.tracked.has(node)) this.writes.push({ kind: "style-field", name, value });
      super.setStyleProp(node, name, value);
    }
  }
  trackingHost = new TrackingHost();
  const container = trackingHost.createContainer();
  root = createNativeRoot(trackingHost, container, {
    rootId: "native-direct-writers-execution",
    scheduleCommit() {},
    profileCounter(next) { counterEvents.push(next); },
  });
  const countersAfter = (action) => { counterEvents.length = 0; action(); return Object.assign({}, ...counterEvents); };
  const find = predicate => {
    const visit = node => predicate(node) ? node : node.children.map(visit).find(Boolean);
    return visit(container);
  };
  const rowNode = id => find(node => node.props["data-row"] === id);
  const list = () => find(node => node.tag === "ul");
  root.mount(jsx(app.Board, {}));
  const seed = [
    { id: "a", x: 1, y: 2, rotation: 3 },
    { id: "b", x: 10, y: 20, rotation: 30 },
  ];
  assert.equal(app.rows.apply(app.rows.version, seed.map(row => ({ type: "insert", key: row.id, value: row, beforeKey: null }))).ok, true);
  root.flush();
  const a = rowNode("a");
  const b = rowNode("b");
  trackingHost.tracked.add(a);
  assert.equal(a.props.style.left, "1px");
  assert.equal(a.props.style.top, "2px");
  assert.equal(a.props.style.transform, "rotate(3deg)");
  assert.equal(a.props.style.color, "navy");
  assert.equal(app.trace.renders.a, 1);
  assert.equal(app.trace.renders.b, 1);
  assert.equal(app.rows.stats().readerCount, 1);

  app.trace.observationNode = a;
  const beforeRender = { ...app.trace.renders };
  const numericCounters = countersAfter(() => {
    assert.equal(app.trace.controls.a.setX(5), true);
    assert.equal(app.trace.controls.a.setY(7), true);
    assert.equal(app.trace.controls.a.setRotation(45), true);
    assert.equal(app.trace.setShowObserver(true), true);
    assert.equal(app.version.dispatch(1), true);
    root.flush();
  });
  assert.deepEqual(app.trace.renders, beforeRender, "numeric direct writes re-executed a row");
  assert.equal(rowNode("a"), a, "numeric publication replaced the row host");
  assert.deepEqual(a.props.style, { left: "5px", top: "7px", transform: "rotate(45deg)", color: "navy" });
  assert.equal(trackingHost.writes.filter(write => write.kind === "style-aggregate").length, 0, "numeric writes used aggregate style updates");
  assert.deepEqual(trackingHost.writes.filter(write => write.kind === "style-field").map(write => write.name), ["left", "top", "transform"]);
  assert.equal(app.trace.observations.at(-1).current, 1);
  assert.deepEqual({ left: app.trace.observations.at(-1).left, top: app.trace.observations.at(-1).top, transform: app.trace.observations.at(-1).transform }, { left: "5px", top: "7px", transform: "rotate(45deg)" }, "same-commit observer saw stale numeric fields");
  assert.equal(app.trace.observerRenders, 1);

  const insertCounters = countersAfter(() => {
    assert.equal(app.rows.apply(app.rows.version, [{ type: "insert", key: "c", value: { id: "c", x: 4, y: 5, rotation: 6 }, beforeKey: "a" }]).ok, true);
    root.flush();
  });
  const c = rowNode("c");
  assert.equal(list().children[0], c);
  assert.equal(rowNode("a"), a);
  assert.equal(rowNode("b"), b);
  assert.equal(app.trace.renders.a, beforeRender.a);
  assert.equal(app.trace.renders.b, beforeRender.b);
  assert.equal(app.trace.renders.c, 1);
  assert.equal(insertCounters["vdom.keyed-region-delta.operations"], 1, "insert did not use the keyed delta path");
  assert.ok(insertCounters["vdom.keyed-region-delta.binding-attaches"] > 0, "insert did not attach the new row writers");
  trackingHost.tracked.add(c);
  const cRenders = app.trace.renders.c;
  assert.equal(app.trace.controls.c.setY(11), true);
  root.flush();
  assert.equal(c.props.style.top, "11px", "newly inserted row did not receive later state writes");
  assert.equal(app.trace.renders.c, cRenders, "new row state update re-executed its component");

  const moveCounters = countersAfter(() => {
    assert.equal(app.rows.apply(app.rows.version, [{ type: "move", key: "c", beforeKey: null }]).ok, true);
    root.flush();
  });
  assert.equal(list().children.at(-1), c);
  assert.equal(rowNode("a"), a);
  assert.equal(rowNode("b"), b);
  assert.equal(moveCounters["vdom.keyed-region-delta.operations"], 1, "move did not use the keyed delta path");

  const removeCounters = countersAfter(() => {
    assert.equal(app.rows.apply(app.rows.version, [{ type: "remove", key: "c" }]).ok, true);
    root.flush();
  });
  assert.equal(rowNode("c"), undefined);
  assert.equal(c.parent, null);
  assert.equal(app.trace.detached.c, 1);
  assert.equal(removeCounters["vdom.keyed-region-delta.operations"], 1, "remove did not use the keyed delta path");
  assert.ok(removeCounters["vdom.keyed-region-delta.binding-detaches"] > 0, "remove did not detach the removed row writers");
  const afterRemoveRenders = { ...app.trace.renders };
  assert.equal(app.trace.controls.a.setX(8), true);
  root.flush();
  assert.equal(a.props.style.left, "8px", "existing direct writer stopped working after structural deltas");
  assert.deepEqual(app.trace.renders, afterRemoveRenders);

  const dispose = countersAfter(() => root.dispose());
  assert.equal(root.diagnostics().disposed, true);
  assert.equal(app.trace.observerSetups, app.trace.observerCleanups, "observer cleanup did not balance");
  assert.equal(app.rows.stats().readerCount, 0);
  assert.equal(app.rows.stats().retainedBatches, 0);
  assert.deepEqual(app.version.diagnostics(), { roots: 0, listeners: 0, readers: 0, retainedActions: 0, transitions: 0 });

  console.log("Compiled direct-writer execution PASS:", JSON.stringify({
    proof: "OXC-emitted __nativeBindStatePropAt for all three Row state sites and __nativeRenderCollectionAt; numeric direct style fields, no Row rerender, coherent same-commit observer, keyed insert/move/remove and live writers",
    counters: { numeric: numericCounters, insert: insertCounters, move: moveCounters, remove: removeCounters, dispose },
  }));
} finally {
  try {
    root?.dispose();
    if (root) assert.equal(root.diagnostics().disposed, true, "generated root was not disposed during cleanup");
    if (app) {
      assert.equal(app.rows.stats().readerCount, 0);
      assert.equal(app.rows.stats().retainedBatches, 0);
      assert.deepEqual(app.version.diagnostics(), { roots: 0, listeners: 0, readers: 0, retainedActions: 0, transitions: 0 });
    }
  } finally {
    try { await unlink(outputPath); } catch (error) { if (error?.code !== "ENOENT") throw error; }
    plugin.closeBundle?.call({});
  }
}
