import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transformWithOxc } from "vite";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { createNativeRoot, jsx, storeRecord } from "../src/native_runtime_api.ts";
import { defineComponent, useStoreAt } from "../src/component_state_runtime.ts";
import { registerCompiledSemanticPlan } from "../src/compiled_semantic_plan.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { OwnerStateWorld } from "../src/owner_state_world.ts";

const rootPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifact = path.join(rootPath, ".cache", `compiled-owned-store-execution-${randomUUID()}`);
const runtime = pathToFileURL(path.join(rootPath, "src/native_runtime_api.ts")).href;
const source = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, storeRecord, use, jsx } from ${JSON.stringify(runtime)};
export const clock = createStore(storeRecord({ phase: 0 }));
export function Data(props) {
  const frame = use(props.clock);
  return <group key="data" name="renamed-phase-anchor" position-x={frame.phase * 2} />;
}`;
const counters = {};
const count = frame => {
  for (const [name, value] of Object.entries(frame)) counters[name] = (counters[name] ?? 0) + value;
};
const reset = () => { for (const name of Object.keys(counters)) delete counters[name]; };
const roots = [];
let primaryError, plugin;
try {
  await mkdir(artifact, { recursive: true });
  const sourcePath = path.join(artifact, "authored.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  plugin = nativeModuleCompilerPlugin({ root: rootPath,
    compilerBinary: path.join(rootPath, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike") });
  const transformed = await plugin.transform.call({ addWatchFile() {},
    error(message) { throw new Error(String(message)); } }, source, sourcePath);
  assert.ok(transformed?.code);
  assert.match(transformed.code, /closedStoreExecution:/);
  assert.doesNotMatch(transformed.code, /closedStoreNumericKernel:/);
  assert.match(transformed.code, /renamed-phase-anchor/);
  await writeFile(path.join(artifact, "transformed.tsx"), transformed.code, { flag: "wx" });
  const emitted = await transformWithOxc(transformed.code, sourcePath,
    { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
  const modulePath = path.join(artifact, "compiled.mjs");
  await writeFile(modulePath, emitted.code, { flag: "wx" });
  const app = await import(pathToFileURL(modulePath).href);
  const file = `owned-legacy-${randomUUID()}.tsx`, revision = "owned-legacy-v1";
  registerCompiledSemanticPlan({ schema_version: 1, source_file: file, module_revision: revision,
    owners: [], sources: [], sinks: [], operations: [],
    graph: { coverage: "proven-sinks-only", source_to_sinks: {}, execution_order: [] } });
  const site = `${file}#component:Legacy`, useSite = `${site}#store:0`;
  const calls = [];
  const failure = new Error("manual-kernel-original-error");
  let fail = false;
  const Legacy = defineComponent(site, props => {
    const frame = useStoreAt(useSite, props.clock);
    return jsx("group", { key: "legacy", "position-x": frame.phase * 3 }, props.children);
  }, { propOnlySites: [], closedStoreHostProgram: {
    schemaVersion: 6, componentProgramId: site, moduleRevision: revision,
    retainedChildProp: "children",
    inputs: [{ storeUseSiteId: useSite, storeProp: "clock", paths: [["phase"]] }],
    host: { tag: "group", key: "legacy", child: null, props: [["position-x", {
      kind: "binary", operator: "*", left: { kind: "input", index: 0 },
      right: { kind: "literal", value: 3 },
    }]] },
  }, closedStoreNumericKernel: {
    schemaVersion: 1, componentProgramId: site, moduleRevision: revision,
    inputCount: 1, propNames: ["position-x"],
    executeRange(inputs, inputStart, rowCount, outputs, outputStart) {
      calls.push({ inputStart, rowCount, outputStart, inputs: [...inputs] });
      if (fail) throw failure;
      for (let row = 0; row < rowCount; row++) outputs[outputStart + row] = inputs[inputStart + row] * 3;
      return rowCount;
    },
  } });
  const make = (label, options = {}) => {
    const host = new MemoryVDOMHost(), container = host.createContainer();
    const root = createNativeRoot(host, container,
      { rootId: `${label}-${randomUUID()}`, scheduleCommit() {}, profileCounter: count,
        ...options });
    roots.push(root);
    return { root, container };
  };
  const pure = make("data-only");
  pure.root.mount(jsx("group", { key: "scene" }, ["a", "b"].map(key =>
    jsx(app.Data, { key, clock: app.clock }))));
  const original = [...pure.container.children[0].children];
  reset();
  app.clock.dispatch(() => storeRecord({ phase: 2 }));
  assert.equal(pure.root.flush(), true);
  assert.equal(counters["store.owned-data.rows"], 2);
  assert.equal(counters["publication.immediate.runs"], 1);
  assert.equal(counters["publication.deferred-adapters"] ?? 0, 0);
  assert.equal(counters["store.owned-data.batches"], 1);
  assert.equal(counters["store.owned-data.enclosed-batches"], 1);
  assert.equal(counters["store.numeric-kernel.runs"] ?? 0, 0);
  pure.container.children[0].children.forEach((node, index) => assert.equal(node, original[index]));
  for (const node of original) {
    assert.equal(node.props.name, "renamed-phase-anchor");
    assert.equal(node.props["position-x"], 4);
  }
  const mixed = make("mixed");
  mixed.root.mount(jsx("group", { key: "scene" }, [
    jsx(app.Data, { key: "a", clock: app.clock }),
    jsx(Legacy, { key: "legacy-owner", clock: app.clock,
      children: jsx("mesh", { key: "retained" }) }),
    jsx(app.Data, { key: "b", clock: app.clock }),
  ]));
  const nodes = [...mixed.container.children[0].children], child = nodes[1].children[0];
  reset(); calls.length = 0;
  app.clock.dispatch(() => storeRecord({ phase: 3 }));
  assert.equal(mixed.root.flush(), true);
  assert.equal(counters["store.owned-data.rows"], 2);
  assert.equal(counters["store.owned-data.batches"] ?? 0, 0);
  assert.equal(counters["store.owned-data.enclosed-batches"] ?? 0, 0);
  assert.equal(counters["store.numeric-kernel.runs"], 1);
  assert.deepEqual(calls, [{ inputStart: 0, rowCount: 1, outputStart: 0, inputs: [3] }]);
  assert.deepEqual(nodes.map(node => node.props["position-x"]), [6, 9, 6]);
  assert.equal(nodes[1].children[0], child);
  const publicBase = pure.root.publicationVersion;
  const deferred = pure.root.prepareStores([app.clock]);
  assert.ok(deferred, "public preparation must still return its deferred adapter");
  assert.equal(deferred.baseVersion, publicBase);
  assert.equal(deferred.targetVersion, publicBase + 1);
  assert.equal(pure.container.children[0].children[0].props["position-x"], 4);
  assert.equal(deferred.validate(), true);
  deferred.commitHost();
  assert.equal(pure.root.publicationVersion, publicBase,
    "host application must not advance accepted publication early");
  deferred.publish(); deferred.runEffects();
  assert.equal(pure.root.publicationVersion, publicBase + 1);
  assert.equal(pure.container.children[0].children[0], original[0]);
  assert.equal(original[0].props["position-x"], 6);
  assert.equal(deferred.validate(), false, "released public facade must stay closed");
  assert.throws(() => deferred.commitHost());
  deferred.discard();
  const accepted = mixed.root.publicationVersion;
  fail = true;
  app.clock.dispatch(() => storeRecord({ phase: 4 }));
  assert.throws(() => mixed.root.prepareStores([app.clock]), error => error === failure);
  assert.equal(mixed.root.publicationVersion, accepted);
  assert.deepEqual(nodes.map(node => node.props["position-x"]), [6, 9, 6]);
  const observedLineages = [];
  class PublicWorld extends OwnerStateWorld {
    ownerLineage(owner) {
      observedLineages.push(owner);
      return super.ownerLineage(owner);
    }
  }
  const conservative = make("public-world", { world: new PublicWorld() });
  conservative.root.mount(jsx("group", { key: "scene" }, [
    jsx(app.Data, { key: "a", clock: app.clock }),
    jsx(app.Data, { key: "b", clock: app.clock }),
  ]));
  const publicNodes = [...conservative.container.children[0].children];
  observedLineages.length = 0; reset();
  app.clock.dispatch(() => storeRecord({ phase: 5 }));
  const publicCut = conservative.root.prepareStores([app.clock]);
  assert.ok(publicCut, "passive decline must preserve public World preparation");
  assert.ok(observedLineages.length >= 2, "public lineage callbacks remain observable");
  assert.equal(counters["store.owned-data.enclosed-batches"] ?? 0, 0);
  assert.equal(publicCut.validate(), true);
  publicCut.commitHost(); publicCut.publish(); publicCut.runEffects();
  assert.deepEqual(publicNodes.map(node => node.props["position-x"]), [10, 10]);
  conservative.container.children[0].children.forEach((node, index) =>
    assert.equal(node, publicNodes[index]));
  console.log(`PASS compiled owned data and manual legacy execution; provenance: ${artifact}`);
} catch (error) { primaryError = error; }
const cleanup = [];
for (const root of roots.reverse()) {
  try { root.dispose(); } catch (error) { cleanup.push(error); }
}
try { await plugin?.closeBundle(); } catch (error) { cleanup.push(error); }
if (primaryError && cleanup.length) throw new AggregateError([primaryError, ...cleanup],
  "Owned execution and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanup.length) throw new AggregateError(cleanup, "Owned execution cleanup failed");
