import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { nativeModulePlugin } from "./vite_native_plugin.ts";
import { createNativeRoot } from "../src/native_runtime_api.ts";
import { jsx } from "../src/jsx_binding_runtime.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot } from "../src/vdom_snapshot_runtime.ts";

const directory = process.cwd();
const nativeImport = pathToFileURL(path.join(directory, "src/native_runtime_api.ts")).href;
const authored = `import { useState, useEffect } from ${JSON.stringify(nativeImport)};
export const control: Record<number, { x: (value: number) => boolean; y: (value: number) => boolean }> = {};
export const trace = { renders: 0, mounts: 0, cleanups: 0 };
export let showLast: (value: boolean) => boolean;
const ids = Array.from({ length: 32 }, (_, index) => index);
export function Row(props: { id: number }) {
  trace.renders++;
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  useEffect(() => {
    control[props.id] = { x: setX, y: setY };
    trace.mounts++;
    return () => { delete control[props.id]; trace.cleanups++; };
  });
  return <div data-row={props.id} data-x={x} data-y={y} data-sum={x + y}
    style={{ left: \`\${x}px\`, top: \`\${y}px\`, width: '7px' }} />;
}
export function App() {
  const [visible, setVisible] = useState(true);
  showLast = setVisible;
  return <main>{ids.map(id => id === 31 && !visible ? null : <Row key={id} id={id} />)}</main>;
}`;
const plugin = nativeModulePlugin();
plugin.configResolved.call({}, { root: directory });
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    return specifier === nativeImport ? { id: path.join(directory, "src/native_runtime_api.ts") } : null;
  },
  error(message) { throw new Error(String(message)); },
};
const counterFrames = [];
let root;
const legacySetSources = VDOMSnapshotRoot.prototype.setSources;
const results = [];
try {
  const transformed = await plugin.transform.call(context, authored, path.join(directory, ".cache/native-numeric-program.tsx"));
  assert.ok(transformed?.code, "ordinary TSX must compile through Rust/OXC");
  const executable = transformed.code.slice(0, transformed.code.indexOf("export const compiledNativeComponentPlan"));
  assert.match(executable, /const __nativeNumericPrograms\s*=/);
  const descriptors = [...executable.matchAll(/sourceSites:\s*\[([^\]]*)\]/g)];
  assert.equal(descriptors.length, 5, "every numeric/CSS sink must have a static descriptor");
  assert.deepEqual(descriptors.map(match => [...match[1].matchAll(/#state:/g)].length).sort(), [1, 1, 1, 1, 2]);
  assert.equal((executable.match(/__nativeBindStateProps?At\(/g) ?? []).length, 5);
  await mkdir(".cache/numeric-program-milestone", { recursive: true });
  const output = path.join(directory, ".cache/numeric-program-milestone/authored-program.mjs");
  await writeFile(output, transformed.code);
  const app = await import(`${pathToFileURL(output).href}?run=${Date.now()}`);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  root = createNativeRoot(host, container, { scheduleCommit() {}, profileCounter(frame) { counterFrames.push(frame); } });
  root.mount(jsx(app.App, {}));
  const findRow = id => container.children[0].children.find(node => node.props["data-row"] === id);
  const retained = Array.from({ length: 32 }, (_, id) => findRow(id));
  const oracle = Array.from({ length: 32 }, () => [0, 0]);
  const aggregate = frames => {
    const result = {};
    for (const frame of frames) for (const [key, value] of Object.entries(frame)) result[key] = (result[key] ?? 0) + value;
    return result;
  };
  const assertRows = () => {
    for (let id = 0; id < 32; id++) {
      const row = findRow(id);
      if (!row) continue;
      const [x, y] = oracle[id];
      assert.equal(row, retained[id], `row ${id} retained host identity`);
      assert.deepEqual([row.props["data-x"], row.props["data-y"], row.props["data-sum"]], [x, y, x + y]);
      assert.deepEqual(row.props.style, { left: `${x}px`, top: `${y}px`, width: "7px" });
    }
  };
  assert.equal(app.trace.renders, 32);
  // If the compiled fast path falls back, fail at the actual generic entry point.
  VDOMSnapshotRoot.prototype.setSources = function () { throw new Error("Compiled program called generic setSources normalization"); };
  for (const [frame, density] of [[1, 1], [2, 4], [3, 32]]) {
    for (let id = 0; id < density; id++) {
      oracle[id] = [frame, frame * 2];
      app.control[id].x(frame);
      app.control[id].y(frame * 2);
    }
    const before = counterFrames.length;
    root.flush();
    assertRows();
    const counters = aggregate(counterFrames.slice(before));
    assert.equal(counters["numeric.program-batches"], 1);
    assert.equal(counters["numeric.program-source-updates"], density * 2);
    assert.equal(counters["numeric.program-projections"], density * 5, "compound sink evaluates once for two dirty inputs");
    assert.equal(counters["numeric.program-writes"], density * 5);
    assert.equal(app.trace.renders, 32, "program updates do not re-execute components");
    results.push({ density, counters });
  }
  // Keep the sum equal while changing both inputs: primitive equality skips it.
  const beforeEqual = counterFrames.length;
  oracle[0] = [4, 5];
  app.control[0].x(4); app.control[0].y(5);
  root.flush(); assertRows();
  const equalCounters = aggregate(counterFrames.slice(beforeEqual));
  assert.equal(equalCounters["numeric.program-projections"], 5);
  assert.equal(equalCounters["numeric.program-writes"], 4);
  assert.equal(equalCounters["numeric.program-skips"], 1);
  VDOMSnapshotRoot.prototype.setSources = legacySetSources;
  const staleSetter = app.control[31].x;
  app.showLast(false); root.flush();
  assert.equal(findRow(31), undefined);
  assert.throws(() => staleSetter(99), /not alive/);
  assert.equal(app.trace.cleanups, 1);
  app.showLast(true); root.flush();
  retained[31] = findRow(31); oracle[31] = [0, 0];
  assertRows();
  assert.equal(app.trace.renders, 33, "only reinserted row rerenders after topology changes");
  VDOMSnapshotRoot.prototype.setSources = function () { throw new Error("Reinserted compiled sink used generic normalization"); };
  app.control[31].x(7); oracle[31] = [7, 0]; root.flush(); assertRows();
  VDOMSnapshotRoot.prototype.setSources = legacySetSources;
  root.dispose();
  assert.equal(app.trace.mounts, app.trace.cleanups);
  assert.equal(root.diagnostics().ownerCount, 0);
  const record = { status: "PASS", proof: "ordinary Rust/OXC TSX; static unary/compound/CSS programs; 32 mounted source scopes; sparse/dense direct execution; generic normalization trap; equal output skip; topology teardown/reactivation", results, equalCounters, trace: app.trace };
  await writeFile(".cache/numeric-program-milestone/execution-proof.json", JSON.stringify(record, null, 2) + "\n");
  console.log("Compiled numeric program PASS:", JSON.stringify(record));
} finally {
  VDOMSnapshotRoot.prototype.setSources = legacySetSources;
  root?.dispose();
  plugin.closeBundle?.call({});
}
