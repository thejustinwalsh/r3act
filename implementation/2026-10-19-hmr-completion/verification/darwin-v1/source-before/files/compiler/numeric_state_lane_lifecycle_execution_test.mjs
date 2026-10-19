import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PendingStateChanges } from "../src/pending_state_changes.ts";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot } from "../src/vdom_snapshot_runtime.ts";
import { nativeModulePlugin } from "./vite_native_plugin.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDirectory = path.join(projectRoot, ".cache/numeric-state-lane-lifecycle");
const attemptId = `${Date.now()}-${process.pid}`;
const authoredPath = path.join(cacheDirectory, `authored-lifecycle-${attemptId}.tsx`);
const emittedPath = path.join(cacheDirectory, `compiled-lifecycle-${attemptId}.mjs`);
const resultPath = path.join(cacheDirectory, `lane-lifecycle-proof-${attemptId}.json`);
const failurePath = path.join(cacheDirectory, `failure-${attemptId}.json`);
const runtimeUrl = pathToFileURL(path.join(projectRoot, "src/native_runtime_api.ts")).href;

const authored = `import { useEffect, useState } from ${JSON.stringify(runtimeUrl)};
export const trace = {
  initializers: 0, renders: 0, events: [], node: null, setValue: null,
};
export function resetTrace() {
  trace.initializers = 0;
  trace.renders = 0;
  trace.events.length = 0;
  trace.node = null;
  trace.setValue = null;
}
export function captureNode(node) {
  if (node) {
    trace.node = node;
    trace.events.push({ kind: "ref", left: node.props.style?.left });
    return () => {
      trace.events.push({ kind: "ref-cleanup", left: node.props.style?.left });
      if (trace.node === node) trace.node = null;
    };
  }
}
export function Row() {
  trace.renders++;
  const [value, setValue] = useState(2);
  trace.setValue = setValue;
  useEffect(() => {
    trace.events.push({ kind: "effect", left: trace.node?.props.style?.left });
    return () => {
      trace.events.push({ kind: "effect-cleanup", left: trace.node?.props.style?.left });
      trace.setValue = null;
    };
  });
  return <i ref={captureNode} style={{ left: \`\${value}px\` }} />;
}`;

const appendedAuthored = `
export function InitProbe() {
  const [seed] = useState(() => {
    trace.initializers++;
    return "seed";
  });
  return <output data-seed={seed} />;
}
export function App() {
  return <main><Row /><InitProbe /></main>;
}`;

const plugin = nativeModulePlugin({ root: projectRoot });
plugin.configResolved?.call({}, { root: projectRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    if (specifier === runtimeUrl) return { id: path.join(projectRoot, "src/native_runtime_api.ts") };
    return null;
  },
  error(message) { throw new Error(String(message)); },
};

const originalCapture = PendingStateChanges.prototype.capture;
const originalSetColumnCells = VDOMSnapshotRoot.prototype.setColumnCells;
const originalExecuteSourceProgram = VDOMSnapshotRoot.prototype.executeSourceProgram;
const metrics = { snapshotCapturesWithPending: 0, laneBatches: [], sourceProgramBatches: 0 };
let root;
let app;

class LifecycleHost extends MemoryVDOMHost {
  onStyleWrite;
  throwOnStyleValue;
  setStyleProp(node, name, value, previous) {
    if (name === "left" && value === this.throwOnStyleValue) {
      throw new Error("lane host write failure");
    }
    super.setStyleProp(node, name, value, previous);
    if (name === "left") this.onStyleWrite?.(node, value);
  }
}

PendingStateChanges.prototype.capture = function (...args) {
  if (this.size > 0) metrics.snapshotCapturesWithPending++;
  return originalCapture.apply(this, args);
};
VDOMSnapshotRoot.prototype.setColumnCells = function (columns, rows, values, count) {
  metrics.laneBatches.push({ count, columnsLength: columns.length, rowsLength: rows.length, valuesLength: values.length });
  return originalSetColumnCells.call(this, columns, rows, values, count);
};
VDOMSnapshotRoot.prototype.executeSourceProgram = function (...args) {
  metrics.sourceProgramBatches++;
  return originalExecuteSourceProgram.apply(this, args);
};

const makeRoot = (host, label) => {
  const container = host.createContainer();
  const next = createNativeRoot(host, container, { rootId: `lane-lifecycle-${label}-${attemptId}`, scheduleCommit() {} });
  next.mount(jsx(app.App, {}));
  return { root: next, container, node: app.trace.node };
};
const hostValue = (rootish) => rootish.node.props.style.left;

try {
  await mkdir(cacheDirectory, { recursive: true });
  await writeFile(authoredPath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored + appendedAuthored, authoredPath);
  assert.ok(transformed?.code, "ordinary authored TSX compiles with Rust/OXC");
  assert.doesNotMatch(authored, /@native-ui|@jsx|\bjsx\s*[,}]/, "fixture uses no author marker, pragma, or jsx factory");
  assert.match(transformed.code, /__nativeBindStatePropAt\(/, "authored style state is compiler bound");
  assert.match(transformed.code, /stateLayout:\s*\{\s*schemaVersion:\s*1/, "Row receives compiler layout metadata");
  assert.match(transformed.code, /sourceSites:\s*\[[^\]]*#component:Row#state:0/, "unary numeric program is emitted for Row");
  await writeFile(emittedPath, transformed.code, { flag: "wx" });
  app = await import(`${pathToFileURL(emittedPath).href}?attempt=${attemptId}`);

  // A healthy numeric lane performs a captured host write, and a nested flush
  // is deferred until the active publication barrier exits.
  app.resetTrace();
  const reentryHost = new LifecycleHost();
  const reentry = makeRoot(reentryHost, "reentry");
  root = reentry.root;
  const setReentryValue = app.trace.setValue;
  assert.equal(app.trace.initializers, 1, "lazy authored child initializer runs once on mount");
  assert.equal(hostValue(reentry), "2px");
  const initialEvents = app.trace.events;
  assert.ok(initialEvents.findIndex((event) => event.kind === "ref") < initialEvents.findIndex((event) => event.kind === "effect"), "ref attaches before effects");
  assert.equal(initialEvents.find((event) => event.kind === "ref")?.left, "2px", "ref sees committed initial output");
  assert.equal(initialEvents.find((event) => event.kind === "effect")?.left, "2px", "effect sees committed initial output");

  metrics.snapshotCapturesWithPending = 0;
  metrics.laneBatches.length = 0;
  metrics.sourceProgramBatches = 0;
  assert.equal(setReentryValue(5), true);
  let reentered = false;
  reentryHost.onStyleWrite = (_node, value) => {
    if (value !== "5px" || reentered) return;
    reentered = true;
    assert.equal(setReentryValue(9), true, "host callback queues a newer state version");
    root.flush();
  };
  assert.equal(root.flush(), true, "initial lane cut commits");
  reentryHost.onStyleWrite = undefined;
  assert.equal(hostValue(reentry), "5px", "outer cut writes its captured value");
  assert.equal(root.diagnostics().pendingChangeCount, 1, "reentrant newer value remains pending");
  assert.equal(root.flush(), true, "deferred newer cut commits in the next flush");
  assert.equal(hostValue(reentry), "9px", "next cut writes the newer value");
  assert.equal(metrics.laneBatches.length, 2, "both captured numeric versions use lane batches");
  assert.deepEqual(metrics.laneBatches.map(({ count }) => count), [1, 1]);
  assert.equal(metrics.snapshotCapturesWithPending, 0, "supported numeric lane cuts avoid generic StateChange snapshots");
  assert.equal(metrics.sourceProgramBatches, 0, "live lane does not use the scalar source-program route");

  // Promotion out of number uses ordinary authored projection. Returning to
  // number stays off the World lane and uses the compiler source program.
  const captureBeforePromotion = metrics.snapshotCapturesWithPending;
  assert.equal(setReentryValue("wide"), true);
  assert.equal(root.flush(), true, "string promotion commits through generic candidate");
  assert.equal(hostValue(reentry), "widepx", "promoted string uses authored template projection");
  assert.equal(app.trace.initializers, 1, "promotion does not rerun the lazy child initializer");
  assert.ok(metrics.snapshotCapturesWithPending > captureBeforePromotion, "nonnumeric promotion uses ordinary snapshot fallback");
  const captureAfterString = metrics.snapshotCapturesWithPending;
  assert.equal(setReentryValue(undefined), true);
  assert.equal(root.flush(), true, "undefined promotion commits through generic candidate");
  assert.equal(hostValue(reentry), "undefinedpx", "undefined uses authored template coercion");
  assert.ok(metrics.snapshotCapturesWithPending > captureAfterString, "undefined state uses ordinary snapshot fallback");
  const laneCountBeforeReturn = metrics.laneBatches.length;
  const sourceProgramBeforeReturn = metrics.sourceProgramBatches;
  const captureBeforeReturn = metrics.snapshotCapturesWithPending;
  assert.equal(setReentryValue(7), true);
  assert.equal(root.flush(), true, "numeric return commits and reinstalls its compiled source binding");
  assert.equal(hostValue(reentry), "7px", "returned number produces correct host output");
  assert.equal(metrics.laneBatches.length, laneCountBeforeReturn, "promoted cell remains sticky-off for World lane writes");
  assert.equal(metrics.sourceProgramBatches, sourceProgramBeforeReturn, "returning to number restores a compiled binding before direct updates");
  assert.ok(metrics.snapshotCapturesWithPending > captureBeforeReturn, "first numeric return uses candidate fallback to reinstall the compiled binding");
  const captureBeforeStickyNumeric = metrics.snapshotCapturesWithPending;
  assert.equal(setReentryValue(8), true);
  assert.equal(root.flush(), true, "later numeric update commits through scalar source-program fallback");
  assert.equal(hostValue(reentry), "8px", "sticky-off numeric source-program output is correct");
  assert.equal(metrics.laneBatches.length, laneCountBeforeReturn, "numeric return remains off World lane after rebinding");
  assert.equal(metrics.sourceProgramBatches, sourceProgramBeforeReturn + 1, "sticky-off numeric update uses scalar source program");
  assert.equal(metrics.snapshotCapturesWithPending, captureBeforeStickyNumeric, "native numeric source-program fallback remains snapshot-free");
  const renderCountAfterPromotion = app.trace.renders;
  assert.equal(app.trace.initializers, 1);
  assert.equal(renderCountAfterPromotion, 4, "string/undefined/first numeric promotion each rerenders the authored component once");

  const oldSetter = setReentryValue;
  root.dispose();
  root = undefined;
  assert.equal(app.trace.setValue, null, "owner cleanup removes its live setter reference");
  assert.throws(() => oldSetter(11), /not alive|inactive|destroyed/i, "disposed owner rejects its stale setter");

  // Host failure while writing the actual numeric lane is terminal, but the
  // owner/effect cleanup path still releases the authored setter.
  app.resetTrace();
  const throwingHost = new LifecycleHost();
  const throwing = makeRoot(throwingHost, "host-failure");
  root = throwing.root;
  assert.equal(app.trace.initializers, 1, "a fresh root invokes its authored lazy child initializer once");
  const staleAfterFailure = app.trace.setValue;
  assert.equal(staleAfterFailure(8), true);
  throwingHost.throwOnStyleValue = "8px";
  assert.throws(() => root.flush(), /lane host write failure/);
  throwingHost.throwOnStyleValue = undefined;
  assert.equal(hostValue(throwing), "2px", "throwing host leaves prior committed output");
  assert.throws(() => root.flush(), /cannot continue|terminal/i, "host commit failure makes later flushes terminal");
  root.dispose();
  root = undefined;
  assert.ok(app.trace.events.some((event) => event.kind === "effect-cleanup"), "terminal root disposal runs effect cleanup");
  assert.equal(app.trace.setValue, null, "terminal disposal clears setter reference");
  assert.throws(() => staleAfterFailure(10), /not alive|inactive|destroyed/i, "terminal disposal invalidates stale setter");

  const proof = {
    status: "PASS",
    runtime: process.version,
    authoredSource: path.relative(projectRoot, authoredPath),
    emittedModule: path.relative(projectRoot, emittedPath),
    numericLaneReentry: {
      capturedWrites: metrics.laneBatches.slice(0, 2),
      outerWriteValue: "5px",
      reentrantPendingValue: 9,
      nextWriteValue: "9px",
      snapshotsDuringSupportedLaneCuts: 0,
    },
    promotion: {
      outputs: ["widepx", "undefinedpx", "7px", "8px"],
      initialStateActivations: app.trace.initializers,
      stickyWorldLaneOff: true,
      scalarSourceProgramFallback: true,
    },
    lifecycle: {
      refBeforeEffect: true,
      effectObservesCommittedValues: true,
      deadSetterRejectedOnDispose: true,
      hostWriteFailureCleanup: true,
      rendersAtPromotionEnd: renderCountAfterPromotion,
    },
    hostFailure: { terminalFlushThrows: true, priorOutputRetained: true, cleanupCompleted: true },
    boundary: "Compiled TSX numeric lane lifecycle and fallback correctness proof; no browser, row-writer integration, or latency claim.",
  };
  await writeFile(resultPath, `${JSON.stringify(proof, null, 2)}\n`, { flag: "wx" });
  console.log("Numeric state lane lifecycle execution PASS:", JSON.stringify(proof));
} catch (error) {
  await writeFile(failurePath, `${JSON.stringify({
    status: "FAIL",
    runtime: process.version,
    authoredSource: path.relative(projectRoot, authoredPath),
    emittedModule: path.relative(projectRoot, emittedPath),
    metrics,
    trace: app ? {
      initializers: app.trace.initializers,
      renders: app.trace.renders,
      events: app.trace.events,
      hasNode: Boolean(app.trace.node),
      hasSetter: Boolean(app.trace.setValue),
    } : null,
    error: String(error?.stack ?? error),
  }, null, 2)}\n`, { flag: "wx" }).catch(() => {});
  throw error;
} finally {
  PendingStateChanges.prototype.capture = originalCapture;
  VDOMSnapshotRoot.prototype.setColumnCells = originalSetColumnCells;
  VDOMSnapshotRoot.prototype.executeSourceProgram = originalExecuteSourceProgram;
  root?.dispose();
  plugin.closeBundle?.call({});
}
