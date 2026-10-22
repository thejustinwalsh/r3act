import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transformWithOxc } from "vite";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const compilerBinary = path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const artifact = path.join(root, ".cache", `compiled-collection-owner-retention-${randomUUID()}`);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const nativeImport = pathToFileURL(path.join(root, "src/native_runtime_api.ts")).href;
const authored = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { jsx, createKeyedCollection, useEffect } from ${JSON.stringify(nativeImport)};
export const rows = createKeyedCollection([
  { id: "dead", payload: { value: "removed" } },
  { id: "live", payload: { value: "surviving" } },
], row => row.id);
export const trace = { mounts: {}, cleanups: {} };
export function Row({ row }) {
  useEffect(() => {
    trace.mounts[row.id] = (trace.mounts[row.id] || 0) + 1;
    return () => { trace.cleanups[row.id] = (trace.cleanups[row.id] || 0) + 1; };
  });
  return <li key={row.id} data-id={row.id} onClick={() => row.payload}>{row.id}</li>;
}
export function List() {
  return <ul>{rows.map(row => <Row row={row} />)}</ul>;
}
export function App() { return <section><List key="list" /></section>; }
`;
const plugin = nativeModuleCompilerPlugin({ root, compilerBinary });
const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
const receipt = { status: "STARTED", artifact, sourceSha256: sha(authored),
  compilerSha256: null, transformedSha256: null, executableSha256: null,
  collectionVersion: null, profile: [], gcCycles: 0, observations: {}, errors: [] };
let mountedRoot, app, primaryError;
try {
  await mkdir(artifact, { recursive: true });
  assert.equal(typeof globalThis.gc, "function", "run with --expose-gc");
  receipt.compilerSha256 = sha(await readFile(compilerBinary));
  const sourcePath = path.join(artifact, "retention.tsx");
  await writeFile(sourcePath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, sourcePath);
  assert.ok(transformed?.code, "actual captured Rust/OXC compiler did not transform source");
  receipt.transformedSha256 = sha(transformed.code);
  await writeFile(path.join(artifact, "transformed.tsx"), transformed.code, { flag: "wx" });
  assert.match(transformed.code, /__nativeRenderCollectionAt/,
    "direct authored collection map was not lowered");
  assert.doesNotMatch(transformed.code, /requiresOwnerRender: true/,
    "pure collection incorrectly requires a whole-owner render");
  const emitted = await transformWithOxc(transformed.code, sourcePath,
    { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
  receipt.executableSha256 = sha(emitted.code);
  const modulePath = path.join(artifact, "executable.mjs");
  await writeFile(modulePath, emitted.code, { flag: "wx" });
  app = await import(pathToFileURL(modulePath).href);
  const host = new MemoryVDOMHost(), container = host.createContainer();
  mountedRoot = createNativeRoot(host, container, {
    rootId: `compiled-collection-retention-${randomUUID()}`,
    scheduleCommit() {}, profileCounter(frame) { receipt.profile.push(frame); },
  });
  mountedRoot.mount(jsx(app.App, {}));
  const ids = () => container.children[0]?.children[0]?.children
    ?.map(node => node.props["data-id"]);
  assert.deepEqual(ids(), ["dead", "live"]);
  assert.deepEqual({ ...app.trace.mounts }, { dead: 1, live: 1 });
  const refs = (() => {
    const removed = app.rows.get("dead");
    const live = app.rows.get("live");
    assert.ok(removed?.payload && live?.payload);
    return { removedRow: new WeakRef(removed), removedPayload: new WeakRef(removed.payload),
      liveRow: new WeakRef(live), livePayload: new WeakRef(live.payload) };
  })();
  const control = (() => new WeakRef({ control: true }))();
  assert.equal(app.rows.apply(app.rows.version, [{ type: "remove", key: "dead" }]).ok, true);
  assert.equal(mountedRoot.flush(), true);
  receipt.collectionVersion = app.rows.version;
  assert.deepEqual(ids(), ["live"]);
  assert.equal(app.rows.get("dead"), undefined);
  assert.equal(app.trace.cleanups.dead, 1);
  assert.equal(app.trace.cleanups.live ?? 0, 0);
  assert.equal(app.rows.stats().retainedBatches, 0);
  assert.equal(mountedRoot.diagnostics().disposed, false);
  assert.equal(receipt.profile.reduce((sum, frame) =>
    sum + (frame["collection.delta-operations"] ?? 0), 0), 1,
  "compiled removal did not take one collection delta operation");
  assert.equal(receipt.profile.reduce((sum, frame) =>
    sum + (frame["owner.component-renders"] ?? 0), 0), 0,
  "pure parent rendered during compiled removal");
  for (let cycle = 0; cycle < 32; cycle++) {
    await new Promise(resolve => setImmediate(resolve));
    globalThis.gc();
    receipt.gcCycles++;
  }
  await new Promise(resolve => setImmediate(resolve));
  receipt.observations = {
    controlCollected: control.deref() === undefined,
    removedRowCollected: refs.removedRow.deref() === undefined,
    removedPayloadCollected: refs.removedPayload.deref() === undefined,
    liveRowRetained: refs.liveRow.deref() !== undefined,
    livePayloadRetained: refs.livePayload.deref() !== undefined,
    rootStillMounted: mountedRoot.diagnostics().disposed === false,
    readerCount: app.rows.stats().readerCount,
  };
  assert.equal(receipt.observations.controlCollected, true,
    "control was retained; this GC run is inconclusive");
  assert.equal(receipt.observations.removedRowCollected, true,
    "removed row stayed alive while its root remained mounted");
  assert.equal(receipt.observations.removedPayloadCollected, true,
    "removed payload stayed alive while its root remained mounted");
  assert.equal(receipt.observations.liveRowRetained, true);
  assert.equal(receipt.observations.livePayloadRetained, true);
  assert.equal(receipt.observations.rootStillMounted, true);
  assert.equal(receipt.observations.readerCount, 1);
  receipt.status = "PASS_COMPILED_COLLECTION_OWNER_RETENTION";
} catch (error) {
  primaryError = error;
  receipt.status = "FAIL_OR_INCOMPLETE";
  receipt.errors.push(error instanceof Error ? error.stack ?? String(error) : String(error));
} finally {
  const cleanupErrors = [];
  try { mountedRoot?.dispose(); } catch (error) { cleanupErrors.push(error); }
  try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
  if (app && mountedRoot) try {
    assert.deepEqual({ ...app.trace.mounts }, { dead: 1, live: 1 });
    assert.deepEqual({ ...app.trace.cleanups }, { dead: 1, live: 1 });
    assert.equal(app.rows.stats().readerCount, 0);
    assert.equal(mountedRoot.diagnostics().ownerCount, 0);
    receipt.cleanup = { mounts: { ...app.trace.mounts }, cleanups: { ...app.trace.cleanups },
      readerCount: app.rows.stats().readerCount, ownerCount: mountedRoot.diagnostics().ownerCount };
  } catch (error) { cleanupErrors.push(error); }
  if (cleanupErrors.length) {
    primaryError = new AggregateError(primaryError ? [primaryError, ...cleanupErrors] : cleanupErrors,
      "compiled collection retention cleanup failed");
    receipt.status = "FAIL_OR_INCOMPLETE";
    receipt.errors.push(String(primaryError));
  }
  await mkdir(artifact, { recursive: true });
  await writeFile(path.join(artifact, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n",
    { flag: "wx" });
}
if (primaryError) throw primaryError;
console.log(JSON.stringify({ status: receipt.status, artifact }));
