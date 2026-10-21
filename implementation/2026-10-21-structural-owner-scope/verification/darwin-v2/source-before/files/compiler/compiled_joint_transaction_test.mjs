import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { nativeModulePlugin } from "./vite_native_plugin.ts";
import { compiledNumericDescriptors } from "./compiled_numeric_descriptor_test_helpers.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.join(projectRoot, ".cache/compiled-joint-transaction");
const attempt = `${Date.now()}-${process.pid}-${randomUUID()}`;
const sourcePath = path.join(directory, `rows-${attempt}.tsx`);
const outputPath = path.join(directory, `rows-${attempt}.mjs`);
const runtimeUrl = pathToFileURL(path.join(projectRoot, "src/native_runtime_api.ts")).href;
const authored = `import { createKeyedCollection, renderCollectionAt, useState, useEffect } from ${JSON.stringify(runtimeUrl)};
export const rows = createKeyedCollection(Array.from({ length: 12 }, (_, index) => ({ id: \`row-\${index}\` })), row => row.id);
export const trace = { setters: Object.create(null), mounts: Object.create(null), cleanups: Object.create(null) };
export function Row({ id }) {
  const [value, setValue] = useState(0);
  useEffect(() => { trace.setters[id] = setValue; trace.mounts[id] = (trace.mounts[id] || 0) + 1; return () => { trace.cleanups[id] = (trace.cleanups[id] || 0) + 1; }; });
  return <li data-id={id} data-value={value}>{id}</li>;
}
export function List() { return <ul>{renderCollectionAt("compiled-joint-rows", rows, row => <Row key={row.id} id={row.id} />)}</ul>; }`;

const plugin = nativeModulePlugin({ root: projectRoot,
  compilerBinary: path.join(projectRoot, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike") });
plugin.configResolved?.call({}, { root: projectRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    return specifier === runtimeUrl ? { id: path.join(projectRoot, "src/native_runtime_api.ts") } : null;
  },
  error(message) { throw new Error(String(message)); },
};
const order = (list) => list.children.map((node) => node.props["data-id"]);
const accept = (candidate) => {
  assert.equal(candidate.validate(), true);
  candidate.commitHost();
  assert.equal(candidate.validatePostHost(), true);
  candidate.preparePublication();
  candidate.publish();
  candidate.installSubscriptions();
  candidate.runEffects();
};

let root;
let app;
let primaryError;
let restoreHookObserver = () => {};
try {
  await mkdir(directory, { recursive: true });
  await writeFile(sourcePath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, sourcePath);
  assert.ok(transformed?.code, "authored TSX did not compile through Rust/OXC");
  await writeFile(outputPath, transformed.code, { flag: "wx" });
  assert.match(transformed.code, /__nativeDefineComponent\(/, "native component lowering is absent");
  assert.match(transformed.code, /renderCollectionAt/, "keyed collection lowering is absent");
  assert.match(transformed.code, /ownerUpdateProgram:/, "owner update program is absent");
  assert.match(transformed.code, /stateLayout:/, "Row state layout is absent");
  assert.match(transformed.code, /moduleRevision:/, "Row module revision is absent");
  assert.ok(compiledNumericDescriptors(transformed.code).some((item) => item.closedExpressionKinds.includes("input")),
    "authored data-value binding has no closed numeric input expression");
  app = await import(`${pathToFileURL(outputPath).href}?attempt=${attempt}`);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const renderFrames = [];
  root = createNativeRoot(host, container, {
    rootId: `compiled-joint-${attempt}`, scheduleCommit() {},
    profileCounter(frame) { renderFrames.push(frame); },
  });
  const rowHookReads = new Map();
  const originalUseState = root.world.useState;
  const originalBeginPreparation = root.world.beginPreparation;
  const countRowHook = (owner, site) => {
    if (site.endsWith("#component:Row#state:0")) {
      rowHookReads.set(owner, (rowHookReads.get(owner) ?? 0) + 1);
    }
  };
  root.world.useState = function (...args) {
    countRowHook(args[0], args[1]);
    return originalUseState.apply(this, args);
  };
  root.world.beginPreparation = function (...args) {
    const preparation = originalBeginPreparation.apply(this, args);
    const useState = preparation.useState;
    preparation.useState = function (...stateArgs) {
      countRowHook(stateArgs[0], stateArgs[1]);
      return useState.apply(this, stateArgs);
    };
    return preparation;
  };
  restoreHookObserver = () => {
    root.world.useState = originalUseState;
    root.world.beginPreparation = originalBeginPreparation;
  };
  root.mount(jsx(app.List, {}));
  const componentRenders = () => renderFrames.reduce((sum, frame) =>
    sum + (frame["owner.component-renders"] ?? 0), 0);
  const list = container.children[0];
  const original = new Map(list.children.map((node) => [node.props["data-id"], node]));
  assert.equal(list.children.length, 12);
  assert.equal(Object.keys(app.trace.setters).length, 12,
    "all authored row controls activate at mount");
  assert.equal(rowHookReads.size, 12, "each Row reads its first state hook at mount");
  assert.ok([...rowHookReads.values()].every((count) => count === 1),
    "each Row executes exactly once at mount");
  assert.equal(componentRenders(), 0, "mount does not emit flush profile frames");
  for (const id of original.keys()) {
    assert.equal(app.trace.mounts[id], 1, `row ${id} effect did not mount exactly once`);
  }

  const dirty = [];
  const unsubscribe = root.world.subscribeDirtyCells((handle) => dirty.push(handle));
  const selected = Array.from({ length: 4 }, (_, index) => `row-${index * 3}`);
  const handles = selected.map((id) => {
    const before = dirty.length;
    assert.equal(app.trace.setters[id](1), true);
    const handle = dirty.slice(before).find((entry) => entry.site.endsWith("#state:0"));
    assert.ok(handle, `missing dirty cell for ${id}`);
    return handle;
  });
  unsubscribe();
  assert.equal(root.flush(), true, "untimed warm-up publication failed");
  const handlesByOwner = new Map(handles.map((handle, index) => [handle.owner, selected[index]]));
  assert.equal(handlesByOwner.size, selected.length, "row state handles are not distinct");
  for (const handle of handles) assert.ok(root.world.cellHandle(handle.owner, handle.site), "captured row cell is no longer live");

  for (const [index, id] of selected.entries()) assert.equal(app.trace.setters[id](index + 2), true);
  const rendersBeforeJointCut = componentRenders();
  const hookReadsBeforeJointCut = new Map(rowHookReads);
  const moved = app.rows.apply(app.rows.version, [{ type: "move", key: "row-0", beforeKey: null }]);
  assert.equal(moved.ok, true, "keyed move was rejected");
  const versionBeforeJointCut = root.publicationVersion;
  const candidate = root.prepareTransaction({ cells: handles, collections: [app.rows] });
  assert.ok(candidate, "joint numeric and keyed transaction was declined");
  accept(candidate);
  assert.equal(root.publicationVersion, versionBeforeJointCut + 1, "joint cut did not publish exactly one root revision");
  assert.deepEqual(order(list), ["row-1", "row-2", "row-3", "row-4", "row-5", "row-6", "row-7", "row-8", "row-9", "row-10", "row-11", "row-0"]);
  for (const [id, node] of original) assert.equal(list.children.find((candidate) => candidate.props["data-id"] === id), node, `${id} host identity changed`);
  for (const [index, id] of selected.entries()) assert.equal(list.children.find((node) => node.props["data-id"] === id).props["data-value"], index + 2);
  assert.equal(componentRenders(), rendersBeforeJointCut,
    "joint cut does not rerender any retained row");
  assert.deepEqual(rowHookReads, hookReadsBeforeJointCut,
    "manual joint candidate does not execute retained Row hooks");
  assert.equal(root.diagnostics().pendingChangeCount, 0, "joint cut left pending numeric changes");
  assert.ok(Object.values(app.trace.mounts).every((count) => count === 1), "move remounted a row");
  console.log("PASS compiled joint transaction: Rust/OXC authored numeric binding and keyed collection share one accepted root candidate.");
} catch (error) {
  primaryError = error;
}
const cleanupErrors = [];
try { restoreHookObserver(); } catch (error) { cleanupErrors.push(error); }
try { root?.dispose(); } catch (error) { cleanupErrors.push(error); }
try {
  if (app) for (const [id, mounts] of Object.entries(app.trace.mounts)) assert.equal(app.trace.cleanups[id], mounts, `row ${id} effect lifetime did not balance`);
} catch (error) { cleanupErrors.push(error); }
try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors], "fixture and cleanup failed");
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "fixture cleanup failed");
