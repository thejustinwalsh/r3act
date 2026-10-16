import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { nativeModulePlugin } from "../../../compiler/vite_native_plugin.ts";
import { createNativeRoot } from "../src/native_runtime_api.ts";
import { compiledOwnerUpdateProgramFor } from "../src/compiled_state_layout.ts";
import { jsx } from "../src/jsx_binding_runtime.ts";
import { VDOMSnapshotRoot, MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const stageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const compilerBinaryPath = path.resolve(process.argv[2] ?? "");
assert.ok(process.argv[2], "pass the ordinal-v2 staged compiler binary");
const attemptId = `${Date.now()}-${process.pid}-${randomUUID()}`;
const outputDir = path.join(stageRoot, "proof", "results");
const authoredPath = path.join(outputDir, `authored-${attemptId}.tsx`);
const emittedPath = path.join(outputDir, `emitted-${attemptId}.mjs`);
const resultPath = path.join(outputDir, `result-${attemptId}.json`);
const failurePath = path.join(outputDir, `failure-${attemptId}.json`);
const runtimePath = path.join(stageRoot, "src/native_runtime_api.ts");
const runtimeUrl = pathToFileURL(runtimePath).href;
const authored = `import { useState } from ${JSON.stringify(runtimeUrl)};
export const trace = { renders: { a: 0, b: 0 }, setters: { a: null, b: null } };
function Row({ id }) {
  trace.renders[id]++;
  const [value, setValue] = useState(1);
  trace.setters[id] = setValue;
  return <output data-parity={value % 2} style={{ left: \`${"${value % 2}"}px\` }} />;
}
export function App() {
  return <main><Row id="a" /><Row id="b" /></main>;
}`;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (filename) => sha256(await readFile(filename));
const plugin = nativeModulePlugin({
  root: projectRoot,
  compilerRoot: projectRoot,
  compilerBinary: compilerBinaryPath,
});
plugin.configResolved?.call({}, { root: projectRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    return specifier === runtimeUrl ? { id: runtimePath } : null;
  },
  error(message) {
    throw new Error(String(message));
  },
};
const findNodes = (node, tag, output = []) => {
  if (node?.tag === tag) output.push(node);
  for (const child of node?.children ?? []) findNodes(child, tag, output);
  return output;
};

const originalExecute = VDOMSnapshotRoot.prototype.executePreparedNumericRows;
const originalDiagnostics = VDOMSnapshotRoot.prototype.diagnostics;
const originalSetProp = MemoryVDOMHost.prototype.setProp;
const originalSetStyleProp = MemoryVDOMHost.prototype.setStyleProp;
const kernelExecutions = [];
let currentRoot;
let app;
let unsubscribeDirty;
let runtimeDiagnostics = [];
VDOMSnapshotRoot.prototype.executePreparedNumericRows = function (...args) {
  const result = originalExecute.apply(this, args);
  kernelExecutions.push({
    count: args[4],
    result,
    counters: originalDiagnostics.call(this),
  });
  return result;
};

class Host extends MemoryVDOMHost {
  writes = [];
  throwOnParity = false;
  reenter = undefined;

  setProp(node, name, value, previous) {
    if (this.throwOnParity && name === "data-parity") {
      throw new Error("intentional owner-kernel host failure");
    }
    originalSetProp.call(this, node, name, value, previous);
    this.writes.push({ kind: "prop", tag: node.tag, name, value });
    if (this.reenter && name === "data-parity") {
      const invoke = this.reenter;
      this.reenter = undefined;
      invoke();
    }
  }

  setStyleProp(node, name, value) {
    originalSetStyleProp.call(this, node, name, value);
    this.writes.push({ kind: "style", tag: node.tag, name, value });
  }
}

const mount = (host, suffix) => {
  const container = host.createContainer();
  const root = createNativeRoot(host, container, {
    rootId: `compiled-owner-kernel-${attemptId}-${suffix}`,
    scheduleCommit() {},
    profileCounter: (counters) => runtimeDiagnostics.push(counters),
  });
  root.mount(jsx(app.App, {}));
  return { root, container };
};

try {
  await mkdir(outputDir, { recursive: true });
  await writeFile(authoredPath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, authoredPath);
  assert.ok(transformed?.code, "ordinary authored TSX compiles with ordinal-v2 compiler");
  assert.doesNotMatch(authored, /@native-ui|@jsx|\bjsx\s*[,}]/);
  assert.match(transformed.code, /ownerUpdateProgram:/);
  assert.match(transformed.code, /schemaVersion:\s*2/);
  assert.match(transformed.code, /stagedInputIndices/);
  await writeFile(emittedPath, transformed.code, { flag: "wx" });
  app = await import(`${pathToFileURL(emittedPath).href}?attempt=${attemptId}`);

  const host = new Host();
  const mounted = mount(host, "main");
  currentRoot = mounted.root;
  const outputs = findNodes(mounted.container, "output");
  assert.equal(outputs.length, 2, "two authored component instances mounted");
  assert.deepEqual(outputs.map((node) => node.props["data-parity"]), [1, 1]);
  assert.deepEqual(outputs.map((node) => node.props.style.left), ["1px", "1px"]);
  assert.deepEqual(app.trace.renders, { a: 1, b: 1 });
  host.writes.length = 0;

  const dirty = [];
  unsubscribeDirty = currentRoot.world.subscribeDirtyCells((handle, version) => {
    dirty.push({ handle, version });
  });
  app.trace.setters.a(3);
  app.trace.setters.b(3);
  assert.equal(dirty.length, 2, "both setters published exact World cell versions");
  for (const { handle, version } of dirty) {
    const row = currentRoot.world.numericRowForCell(handle, version);
    assert.ok(row, "compiler-authored state resolves to a committed numeric row");
    const program = compiledOwnerUpdateProgramFor(row.layout);
    assert.ok(program, "the exact normalized row layout carries the emitted program");
    assert.equal(program.schemaVersion, 2);
    assert.equal(program.programId, row.layout.programId);
    assert.equal(program.slotCount, row.layout.slots.length);
    assert.equal(program.sinkIds.length, 2);
  }
  assert.equal(currentRoot.flush(), true, "an equal-output kernel cut is accepted");
  assert.equal(host.writes.length, 0, "equal primitive projections issue no host writes");
  assert.equal(currentRoot.diagnostics().pendingChangeCount, 0, "captured versions are acknowledged");
  assert.equal(currentRoot.world.hasPendingChanges(), false, "World has no pending captured version");
  assert.deepEqual(app.trace.renders, { a: 1, b: 1 }, "numeric cut does not rerender components");
  assert.equal(kernelExecutions.length, 1, "one homogeneous cut invokes one VDOM row executor");
  assert.equal(kernelExecutions[0].count, 2);
  assert.equal(kernelExecutions[0].counters.preparedOwnerUpdateKernelBatches, 1);
  assert.equal(kernelExecutions[0].counters.preparedOwnerUpdateKernelRows, 2);
  assert.equal(kernelExecutions[0].counters.preparedOwnerUpdateKernelInputs, 2);
  assert.equal(kernelExecutions[0].counters.preparedOwnerUpdateKernelStagedSinks, 0);
  const equalCutCounters = kernelExecutions[0].counters;

  app.trace.setters.a(4);
  app.trace.setters.b(4);
  host.reenter = () => {
    assert.equal(app.trace.setters.a(9), true, "host reentry publishes a newer state version");
    assert.equal(currentRoot.flush(), false, "nested flush stays behind publication barrier");
  };
  assert.equal(currentRoot.flush(), true, "captured changed-output cut completes");
  assert.deepEqual(outputs.map((node) => node.props["data-parity"]), [0, 0], "outer cut writes captured value");
  assert.deepEqual(outputs.map((node) => node.props.style.left), ["0px", "0px"]);
  assert.equal(currentRoot.diagnostics().pendingChangeCount, 1, "newer reentrant version remains pending");
  assert.equal(currentRoot.world.hasPendingChanges(), true, "World retains newer version");
  assert.deepEqual(app.trace.renders, { a: 1, b: 1 });
  assert.equal(kernelExecutions.length, 2, "second homogeneous cut invokes one kernel");
  assert.equal(kernelExecutions[1].counters.preparedOwnerUpdateKernelBatches, 2);
  assert.equal(kernelExecutions[1].counters.preparedOwnerUpdateKernelRows, 4);
  assert.equal(kernelExecutions[1].counters.preparedOwnerUpdateKernelStagedSinks, 4);

  assert.equal(currentRoot.flush(), true, "the newer version is committed on the next flush");
  assert.deepEqual(outputs.map((node) => node.props["data-parity"]), [1, 0]);
  assert.deepEqual(outputs.map((node) => node.props.style.left), ["1px", "0px"]);
  assert.equal(currentRoot.diagnostics().pendingChangeCount, 0, "all exact versions are acknowledged");
  assert.equal(currentRoot.world.hasPendingChanges(), false);
  assert.deepEqual(app.trace.renders, { a: 1, b: 1 });
  assert.equal(kernelExecutions.length, 3, "each homogeneous dirty cut uses one executor call");
  assert.equal(kernelExecutions[2].counters.preparedOwnerUpdateKernelBatches, 3);
  assert.equal(kernelExecutions[2].counters.preparedOwnerUpdateKernelInputs, 5);

  unsubscribeDirty();
  unsubscribeDirty = undefined;
  currentRoot.dispose();
  currentRoot = undefined;

  app.trace.renders = { a: 0, b: 0 };
  app.trace.setters = { a: null, b: null };
  const failingHost = new Host();
  const failed = mount(failingHost, "failure");
  currentRoot = failed.root;
  failingHost.writes.length = 0;
  app.trace.setters.a(2);
  failingHost.throwOnParity = true;
  assert.throws(() => currentRoot.flush(), /intentional owner-kernel host failure/);
  assert.equal(currentRoot.diagnostics().pendingChangeCount, 1, "host failure does not acknowledge the captured version");
  assert.equal(currentRoot.world.hasPendingChanges(), true);
  assert.throws(() => currentRoot.flush(), /terminal|failed|failure/i, "host failure makes the root terminal");
  currentRoot.dispose();
  assert.equal(currentRoot.diagnostics().disposed, true, "terminal root cleanup completes on dispose");
  assert.equal(currentRoot.diagnostics().ownerCount, 0, "dispose releases owner state");
  assert.equal(currentRoot.diagnostics().pendingChangeCount, 0, "dispose releases failed-cut buffers");

  const proof = {
    status: "PASS",
    claim: "actual authored TSX reaches the homogeneous schema-v2 owner kernel through Root, acknowledges exact versions, and preserves no-write, reentry, and terminal host-failure behavior",
    fixtureScope: "primitive arithmetic is written inline in JSX; derived locals used by JSX were classified outside_state_reads and emitted no owner update program",
    derivedLocalClassificationAttempt: "1791924039085-88611-4c0772da-762b-4b72-a2e0-a80a796b9665",
    attemptId,
    command: process.argv,
    node: process.version,
    compilerBinaryPath,
    hashes: {
      authored: await hashFile(authoredPath),
      emitted: await hashFile(emittedPath),
      compilerBinary: await hashFile(compilerBinaryPath),
      layout: await hashFile(path.join(stageRoot, "src/compiled_state_layout.ts")),
      componentRoot: await hashFile(path.join(stageRoot, "src/component_state_runtime.ts")),
      world: await hashFile(path.join(stageRoot, "src/owner_state_world.ts")),
      vdomV5: await hashFile(path.join(stageRoot, "src/vdom_snapshot_runtime.ts")),
      runtimeApi: await hashFile(path.join(stageRoot, "src/native_runtime_api.ts")),
    },
    kernelCuts: kernelExecutions.map(({ count, result, counters }) => ({
      count,
      result,
      batches: counters.preparedOwnerUpdateKernelBatches,
      rows: counters.preparedOwnerUpdateKernelRows,
      inputs: counters.preparedOwnerUpdateKernelInputs,
      stagedSinks: counters.preparedOwnerUpdateKernelStagedSinks,
    })),
    equalCutCounters,
    visible: outputs.map((node) => ({ parity: node.props["data-parity"], left: node.props.style.left })),
    renders: app.trace.renders,
    hostWritesAfterEqualCut: 0,
    pendingAfterReentry: 1,
    terminalFailureAcknowledged: false,
    finalRuntimeCounters: runtimeDiagnostics.at(-1),
  };
  await writeFile(resultPath, `${JSON.stringify(proof, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify({ resultPath, proof }, null, 2));
} catch (error) {
  const failure = {
    status: "FAIL",
    attemptId,
    error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    authoredPath,
    emittedPath,
    compilerBinaryPath,
    compilerBinarySha256: await hashFile(compilerBinaryPath).catch(() => null),
    kernelExecutions,
  };
  await writeFile(failurePath, `${JSON.stringify(failure, null, 2)}\n`, { flag: "wx" });
  throw error;
} finally {
  unsubscribeDirty?.();
  currentRoot?.dispose();
  VDOMSnapshotRoot.prototype.executePreparedNumericRows = originalExecute;
  VDOMSnapshotRoot.prototype.diagnostics = originalDiagnostics;
  MemoryVDOMHost.prototype.setProp = originalSetProp;
  MemoryVDOMHost.prototype.setStyleProp = originalSetStyleProp;
  plugin.closeBundle?.call({});
}
