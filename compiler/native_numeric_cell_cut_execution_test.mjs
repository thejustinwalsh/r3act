import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PendingStateChanges } from "../src/pending_state_changes.ts";
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
  ".cache/native-cell-cut-milestone",
);
const authoredPath = path.join(cacheDirectory, "authored-numeric-cells.tsx");
const emittedPath = path.join(cacheDirectory, "compiled-numeric-cells.mjs");
const resultPath = path.join(cacheDirectory, "execution-proof.json");
const runtimeUrl = pathToFileURL(
  path.join(projectRoot, "src/native_runtime_api.ts"),
).href;

const authored = `import { useState, useEffect } from ${JSON.stringify(runtimeUrl)};
export const controls: Record<number, {
  x: (value: number) => boolean;
  y: (value: number) => boolean;
  label: (value: string) => boolean;
}> = {};
export const trace = { appRenders: 0 };
export let showLast: (value: boolean) => boolean;
const ids = Array.from({ length: 32 }, (_, index) => index);

export function Row({ id }: { id: number }) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [label, setLabel] = useState("row-" + id);
  useEffect(() => { controls[id] = { x: setX, y: setY, label: setLabel }; });
  return <div data-row={id} data-x={x} data-y={y} data-sum={x + y}
    style={{ left: \`\${x}px\`, top: \`\${y}px\`, width: "7px" }}>{\`\${label}\`}</div>;
}

export function App() {
  trace.appRenders++;
  const [visible, setVisible] = useState(true);
  showLast = setVisible;
  return <main>{ids.map(id => id === 31 && !visible ? null : <Row key={id} id={id} />)}</main>;
}`;

const plugin = nativeModulePlugin({ root: projectRoot });
plugin.configResolved?.call({}, { root: projectRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    if (specifier === runtimeUrl) {
      return { id: path.join(projectRoot, "src/native_runtime_api.ts") };
    }
    return null;
  },
  error(message) {
    throw new Error(String(message));
  },
};

const aggregate = (frames) => {
  const result = {};
  for (const frame of frames) {
    for (const [key, value] of Object.entries(frame)) {
      result[key] = (result[key] ?? 0) + value;
    }
  }
  return result;
};

let root;
let app;
const counterFrames = [];
const originalCapture = PendingStateChanges.prototype.capture;
const originalCaptureNative = PendingStateChanges.prototype.captureNative;
const originalSetSources = VDOMSnapshotRoot.prototype.setSources;
let captureCalls = 0;
let captureNativeCalls = 0;
const fallbackSnapshots = [];

try {
  await mkdir(cacheDirectory, { recursive: true });
  await writeFile(authoredPath, authored);
  const transformed = await plugin.transform.call(context, authored, authoredPath);
  assert.ok(transformed?.code, "ordinary TSX must compile through Rust/OXC");
  const executable = transformed.code.slice(
    0,
    transformed.code.indexOf("export const compiledNativeComponentPlan"),
  );
  assert.match(executable, /const __nativeNumericPrograms\s*=/);
  const descriptors = [...executable.matchAll(/sourceSites:\s*\[([^\]]*)\]/g)];
  assert.equal(descriptors.length, 5, "four scalar/CSS and one compound sink are compiled");
  assert.deepEqual(
    descriptors.map((match) => [...match[1].matchAll(/#state:/g)].length).sort(),
    [1, 1, 1, 1, 2],
  );
  assert.equal(
    (executable.match(/__nativeBindStateProps?At\(/g) ?? []).length,
    5,
  );
  assert.match(
    transformed.code,
    /propOnlySites: \[[^\]]*#component:Row#state:0[^\]]*#component:Row#state:1/s,
    "only compiler-certified numeric row cells should enter the direct cut",
  );
  await writeFile(emittedPath, transformed.code);
  app = await import(`${pathToFileURL(emittedPath).href}?run=${Date.now()}`);

  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  root = createNativeRoot(host, container, {
    rootId: "native-numeric-cell-cut",
    scheduleCommit() {},
    profileCounter(frame) {
      counterFrames.push(frame);
    },
  });
  root.mount(jsx(app.App, {}));
  const list = () => container.children[0];
  const row = (id) => list().children.find((node) => node.props["data-row"] === id);
  const retained = Array.from({ length: 32 }, (_, id) => row(id));
  const oracle = Array.from({ length: 32 }, () => [0, 0]);
  const assertRows = () => {
    for (let id = 0; id < 32; id++) {
      const node = row(id);
      if (!node) continue;
      const [x, y] = oracle[id];
      assert.equal(node, retained[id], `row ${id} host identity`);
      assert.deepEqual(
        [node.props["data-x"], node.props["data-y"], node.props["data-sum"]],
        [x, y, x + y],
      );
      assert.deepEqual(node.props.style, {
        left: `${x}px`,
        top: `${y}px`,
        width: "7px",
      });
    }
  };
  const componentRenders = () => aggregate(counterFrames)["owner.component-renders"] ?? 0;
  const initialComponentRenders = componentRenders();
  assert.equal(Object.keys(app.controls).length, 32,
    "all authored row controls activate at mount");
  assert.equal(initialComponentRenders, 0, "mount does not emit flush profile frames");

  // Eligible native cuts must bypass both snapshot arrays and generic source
  // normalization. The compiler emits the static programs from ordinary TSX.
  PendingStateChanges.prototype.capture = function () {
    captureCalls++;
    throw new Error("Eligible numeric cell cut called capture()");
  };
  PendingStateChanges.prototype.captureNative = function (...args) {
    captureNativeCalls++;
    return originalCaptureNative.apply(this, args);
  };
  VDOMSnapshotRoot.prototype.setSources = function () {
    throw new Error("Eligible numeric cell cut used generic setSources()");
  };

  const numericFrames = [];
  for (const [frame, density] of [[1, 1], [2, 4], [3, 32]]) {
    for (let id = 0; id < density; id++) {
      oracle[id] = [frame, frame * 2];
      assert.equal(app.controls[id].x(frame), true);
      assert.equal(app.controls[id].y(frame * 2), true);
    }
    const before = counterFrames.length;
    assert.equal(root.flush(), true, `numeric frame ${frame} was not flushed`);
    assertRows();
    const counters = aggregate(counterFrames.slice(before));
    assert.equal(counters["numeric.program-batches"], 1);
    assert.equal(counters["numeric.program-source-updates"], density * 2);
    assert.equal(counters["numeric.program-projections"], density * 5);
    assert.equal(counters["numeric.program-writes"], density * 5);
    assert.equal(componentRenders(), initialComponentRenders,
      "eligible numeric-only frames rerendered a component");
    numericFrames.push({ density, counters });
  }
  assert.equal(captureCalls, 0, "eligible frames materialized independent state snapshots");
  assert.ok(captureNativeCalls >= 3, "native reusable cell capture was not used");
  const eligibleCaptureCalls = captureCalls;

  // Nonnumeric state is deliberately absent from compiler prop-only metadata.
  // Restore generic entry points and show it takes the independent snapshot path.
  PendingStateChanges.prototype.capture = function (...args) {
    captureCalls++;
    const snapshot = originalCapture.apply(this, args);
    fallbackSnapshots.push(snapshot);
    return snapshot;
  };
  VDOMSnapshotRoot.prototype.setSources = originalSetSources;
  const rendersBeforeLabel = componentRenders();
  assert.equal(app.controls[0].label("changed-label"), true);
  assert.equal(root.flush(), true);
  assert.equal(row(0).children[0].text, "changed-label");
  assert.equal(componentRenders() - rendersBeforeLabel, 1,
    "unsupported label update rerenders only its row");
  assert.ok(captureCalls > 0, "unsupported state did not take snapshot fallback");

  let labelCoercions = 0;
  const opaqueLabel = {
    toString() { labelCoercions++; return "opaque-label"; },
  };
  assert.equal(app.controls[0].label(opaqueLabel), true);
  assert.equal(root.flush(), true, "object label promotes through generic render");
  assert.equal(row(0).children[0].text, "opaque-label");
  const coercionsBeforeNumeric = labelCoercions;
  const rendersBeforeOpaqueNumeric = componentRenders();
  assert.equal(app.controls[0].x(7), true);
  oracle[0][0] = 7;
  assert.equal(root.flush(), true, "numeric update with object sibling uses generic render");
  assertRows();
  assert.equal(row(0).children[0].text, "opaque-label");
  assert.equal(componentRenders() - rendersBeforeOpaqueNumeric, 1,
    "object sibling revokes owner skip after numeric eligibility was cached");
  assert.ok(labelCoercions > coercionsBeforeNumeric,
    "generic render observes object label coercion on numeric invalidation");
  assert.equal(app.controls[0].label("restored-label"), true);
  assert.equal(root.flush(), true);
  assert.equal(row(0).children[0].text, "restored-label");
  const rendersBeforeRestoredNumeric = componentRenders();
  assert.equal(app.controls[0].x(8), true);
  oracle[0][0] = 8;
  assert.equal(root.flush(), true);
  assertRows();
  assert.equal(componentRenders(), rendersBeforeRestoredNumeric,
    "primitive sibling restores eligible numeric owner cuts");

  // Combine a certified numeric cut with structural App state. This must use
  // the coherent full candidate path, while both state values remain visible.
  const appRendersBeforeTopology = app.trace.appRenders;
  const capturesBeforeTopology = captureCalls;
  assert.equal(app.controls[0].x(9), true);
  oracle[0][0] = 9;
  assert.equal(app.showLast(false), true);
  assert.equal(root.flush(), true);
  assert.equal(row(31), undefined, "structural fallback retained the conditionally removed row");
  assert.deepEqual(
    [row(0).props["data-x"], row(0).props["data-y"], row(0).props["data-sum"]],
    [9, oracle[0][1], 9 + oracle[0][1]],
  );
  assert.ok(captureCalls > capturesBeforeTopology, "mixed topology bypassed snapshot fallback");
  assert.ok(
    app.trace.appRenders > appRendersBeforeTopology,
    "topology fallback did not rerender its affected parent component",
  );
  assert.ok(
    fallbackSnapshots.length >= 2 && fallbackSnapshots.at(-1) !== fallbackSnapshots.at(-2),
    "fallback capture reused a prior independent state snapshot array",
  );

  PendingStateChanges.prototype.capture = originalCapture;
  PendingStateChanges.prototype.captureNative = originalCaptureNative;
  VDOMSnapshotRoot.prototype.setSources = originalSetSources;
  const proof = {
    status: "PASS",
    runtime: process.version,
    authoredSource: path.relative(projectRoot, authoredPath),
    emittedModule: path.relative(projectRoot, emittedPath),
    proof:
      "ordinary Rust/OXC TSX; static scalar/compound/CSS programs; 32 owners; sparse/dense snapshot-free numeric cuts; generic setSources trap; unsupported string and mixed topology snapshot fallbacks",
    numericFrames,
    captureCallsForEligibleCuts: eligibleCaptureCalls,
    captureNativeCalls,
    fallbackCaptureArrays: fallbackSnapshots.length,
    finalRows: list().children.length,
    finalNumeric: [row(0).props["data-x"], row(0).props["data-y"], row(0).props["data-sum"]],
    profiledFlushComponentRenders: componentRenders(),
    finalAppRenders: app.trace.appRenders,
  };
  root.dispose();
  root = undefined;
  await writeFile(resultPath, `${JSON.stringify(proof, null, 2)}\n`);
  console.log("Native numeric cell cut PASS:", JSON.stringify(proof));
} finally {
  PendingStateChanges.prototype.capture = originalCapture;
  PendingStateChanges.prototype.captureNative = originalCaptureNative;
  VDOMSnapshotRoot.prototype.setSources = originalSetSources;
  root?.dispose();
  plugin.closeBundle?.call({});
}
