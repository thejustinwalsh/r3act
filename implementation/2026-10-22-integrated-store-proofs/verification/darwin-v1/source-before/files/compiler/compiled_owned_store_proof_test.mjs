import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transformWithOxc } from "vite";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { createNativeRoot, jsx, NativeRootWorkQueue, storeRecord } from "../src/native_runtime_api.ts";
import { invalidateCompiledSemanticPlan } from "../src/compiled_semantic_plan.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const rootPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifact = path.join(rootPath, ".cache", `compiled-owned-store-proof-${randomUUID()}`);
const runtime = pathToFileURL(path.join(rootPath, "src/native_runtime_api.ts")).href;
const binary = process.env.COMPILER_SPIKE_BINARY ??
  path.join(rootPath, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const source = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, storeRecord, use, jsx } from ${JSON.stringify(runtime)};
export const clock = createStore(storeRecord({ phase: 0 }));
export function Motion(props) {
  const frame = use(props.clock);
  return <group key="motion" rotation-y={frame.phase} position-x={frame.phase * 2}>{props.children}</group>;
}`;

class ProofHost extends MemoryVDOMHost {
  onWrite;
  fail = false;
  writes = 0;
  disposed = [];
  failure = new Error("second compiled writer failed");
  setProp(node, name, value, previous) {
    super.setProp(node, name, value, previous);
    if (name === "rotation-y" || name === "position-x") {
      this.writes++;
      this.onWrite?.(value);
      if (this.fail && this.writes === 2) throw this.failure;
    }
  }
  dispose(node) { this.disposed.push(node); }
}

let plugin, queue, sourceFile, first, second, failed, primaryError;
const instances = [];
try {
  await mkdir(artifact, { recursive: true });
  sourceFile = path.join(artifact, "authored.tsx");
  await writeFile(sourceFile, source, { flag: "wx" });
  plugin = nativeModuleCompilerPlugin({ root: rootPath, compilerBinary: binary });
  const transformed = await plugin.transform.call({ addWatchFile() {},
    error(message) { throw new Error(String(message)); } }, source, sourceFile);
  assert.ok(transformed?.code);
  assert.match(transformed.code, /closedStoreExecution/);
  await writeFile(path.join(artifact, "transformed.tsx"), transformed.code, { flag: "wx" });
  const emitted = await transformWithOxc(transformed.code, sourceFile,
    { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
  const modulePath = path.join(artifact, "compiled.mjs");
  await writeFile(modulePath, emitted.code, { flag: "wx" });
  const app = await import(pathToFileURL(modulePath).href);
  const make = label => {
    const host = new ProofHost(), container = host.createContainer();
    const root = createNativeRoot(host, container,
      { rootId: `owned-proof-${label}-${randomUUID()}`, scheduleCommit() {} });
    const child = jsx("mesh", { key: `retained-${label}` });
    root.mount(jsx(app.Motion, { key: "owner", clock: app.clock, children: child }));
    const target = container.children[0], retained = target.children[0];
    const instance = { root, host, container, target, retained };
    instances.push(instance);
    return instance;
  };
  first = make("first"); second = make("second");
  const old = [first.root.snapshot, second.root.snapshot];
  const oldText = old.map(value => JSON.stringify(value));
  queue = new NativeRootWorkQueue({ maxStaleRetries: 0 });
  let reentered = false;
  first.host.onWrite = value => {
    if (value === 1 && !reentered) {
      reentered = true;
      app.clock.dispatch(() => storeRecord({ phase: 2 }));
    }
  };
  app.clock.dispatch(() => storeRecord({ phase: 1 }));
  const accepted = queue.enqueueStores({ id: `owned-proof-accepted-${randomUUID()}`,
    roots: [{ root: first.root, stores: [app.clock] },
      { root: second.root, stores: [app.clock] }] });
  assert.equal(accepted.status, "committed");
  assert.deepEqual([first.target.props["rotation-y"], second.target.props["rotation-y"]], [1, 1]);
  assert.equal(app.clock.getState().phase, 2);
  assert.deepEqual(old.map(value => JSON.stringify(value)), oldText);
  for (const item of [first, second]) {
    assert.strictEqual(item.container.children[0], item.target);
    assert.strictEqual(item.target.children[0], item.retained);
  }
  const newer = queue.enqueueStores({ id: `owned-proof-newer-${randomUUID()}`,
    roots: [{ root: first.root, stores: [app.clock] },
      { root: second.root, stores: [app.clock] }] });
  assert.equal(newer.status, "committed");
  assert.deepEqual([first.target.props["rotation-y"], second.target.props["rotation-y"]], [2, 2]);

  failed = make("failure");
  const failedOld = JSON.stringify(failed.root.snapshot);
  app.clock.dispatch(() => storeRecord({ phase: 3 }));
  failed.host.fail = true;
  failed.host.writes = 0;
  const partial = queue.enqueueStores({ id: `owned-proof-failure-${randomUUID()}`,
    roots: [{ root: failed.root, stores: [app.clock] }] });
  assert.equal(partial.status, "failed");
  assert.equal(JSON.stringify(failed.root.snapshot), failedOld);
  assert.strictEqual(failed.container.children[0], failed.target);
  assert.strictEqual(failed.target.children[0], failed.retained);
  assert.throws(() => failed.root.prepareStores([app.clock]), /failed|quarantined|host/i);

  assert.equal(invalidateCompiledSemanticPlan(path.relative(rootPath, sourceFile)), true);
  assert.equal(first.root.retired, true);
  assert.equal(second.root.retired, true);
  queue.dispose(); queue = null;
  for (const item of instances) item.root.dispose();
  for (const item of instances) {
    assert.equal(item.container.children.length, 0);
    assert.ok(item.host.disposed.length >= 2, "mounted host subtree was not disposed");
    assert.equal(new Set(item.host.disposed).size, item.host.disposed.length);
  }
  await writeFile(path.join(artifact, "result.json"), JSON.stringify({ status: "PASS",
    assertions: { actualCompiledOwnedStore: true, groupReentry: true,
      retainedOldSnapshots: true, secondWriterFailure: true,
      codeRetirement: true, exactDisposal: true },
  }, null, 2) + "\n", { flag: "wx" });
  console.log(`PASS compiled owned Store proof; provenance: ${artifact}`);
} catch (error) { primaryError = error; }
const cleanupErrors = [];
for (const cleanup of [() => queue?.dispose(),
  ...instances.map(item => () => item.root.dispose()),
  () => sourceFile && invalidateCompiledSemanticPlan(path.relative(rootPath, sourceFile)),
  () => plugin?.closeBundle()]) {
  try { await cleanup(); } catch (error) { cleanupErrors.push(error); }
}
if (primaryError && cleanupErrors.length) throw new AggregateError(
  [primaryError, ...cleanupErrors], "Compiled owned Store proof and cleanup failed",
  { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors,
  "Compiled owned Store proof cleanup failed");
