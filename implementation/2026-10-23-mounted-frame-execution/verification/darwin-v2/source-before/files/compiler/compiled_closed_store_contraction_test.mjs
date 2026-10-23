import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { transformWithOxc } from "vite";
import * as THREE from "three";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { createNativeRoot, jsx, NativeRootWorkQueue, storeRecord } from "../src/native_runtime_api.ts";
import { admitPreparedNativeGroup } from "../src/component_state_runtime.ts";
import { evaluateClosedHostValue } from "../src/closed_host_value.ts";
import { normalizeClosedStoreHostProgram } from "../src/closed_store_host_program.ts";
import { OwnerStateWorld } from "../src/owner_state_world.ts";
import { normalizeClosedStoreDataExecution, evaluateClosedStoreDataExecution, inspectClosedStoreDataExecution } from "../src/closed_store_execution.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const rootPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeUrl = pathToFileURL(path.join(rootPath, "src/native_runtime_api.ts")).href;
const binary = path.join(rootPath, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const artifact = path.join(rootPath, ".cache", `compiled-closed-store-contraction-${randomUUID()}`);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const source = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, storeRecord, use, useEffect, useState, jsx } from ${JSON.stringify(runtimeUrl)};
export const clock = createStore(storeRecord({ phase: 0, epoch: 0 }));
export const trace = { controls: {}, cleanups: {}, childRenders: 0, clicks: 0 };
export function Motion(props) {
  const frame = use(props.clock);
  const [offset, setOffset] = useState(0);
  useEffect(() => { trace.controls[props.id] = setOffset;
    return () => { trace.cleanups[props.id] = (trace.cleanups[props.id] ?? 0) + 1;
      delete trace.controls[props.id]; }; });
  return <div key="motion" data-value={(frame.phase + offset) * 2 + frame.epoch}>{props.children}</div>;
}
export function Alternate(props) {
  const frame = use(props.clock);
  const [offset, setOffset] = useState(0);
  useEffect(() => { trace.controls[props.id] = setOffset;
    return () => { trace.cleanups[props.id] = (trace.cleanups[props.id] ?? 0) + 1;
      delete trace.controls[props.id]; }; });
  return <div key="motion" data-value={frame.phase + offset + frame.epoch}>{props.children}</div>;
}
export function Child(props) {
  trace.childRenders++;
  const [count] = useState(0);
  return <button key="child" data-id={props.id} data-count={count}
    onClick={() => { trace.clicks++; }}>child</button>;
}
export function DomApp(props) {
  return <section key="scene">{props.alternate
    ? <Alternate key="owner" id={props.id} clock={clock}><Child key={props.childKey} id={props.id} /></Alternate>
    : <Motion key="owner" id={props.id} clock={clock}><Child key={props.childKey} id={props.id} /></Motion>}
  </section>;
}
export function ThreeMotion(props) {
  const frame = use(props.clock);
  const [offset, setOffset] = useState(0);
  useEffect(() => { trace.controls.three = setOffset;
    return () => { trace.cleanups.three = (trace.cleanups.three ?? 0) + 1; }; });
  return <group key="motion" rotation-y={(frame.phase + offset) * .01 + frame.epoch * .001}>{props.children}</group>;
}
export function ThreeApp() {
  return <group key="scene"><ThreeMotion key="owner" clock={clock}>
    <mesh key="retained"><boxGeometry args={[1,1,1]} /><meshStandardMaterial color="orange" /></mesh>
  </ThreeMotion></group>;
}`;
const property = (node, name) => {
  if (node?.type !== "ObjectExpression") return null;
  const entry = node.properties.find(item => !item.computed &&
    (item.key?.name ?? item.key?.value) === name);
  return entry?.type === "ObjectMethod" ? entry : entry?.value ?? null;
};
const literal = node => ["StringLiteral", "NumericLiteral"].includes(node?.type) ? node.value : null;
const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(item => visit(item, callback));
    else if (value && typeof value === "object") visit(value, callback);
  }
};
const find = (node, predicate) => {
  if (predicate(node)) return node;
  for (const child of node.children ?? []) {
    const found = find(child, predicate);
    if (found) return found;
  }
  return null;
};
const phase = (app, value, epoch = 0) => app.clock.dispatch(() =>
  storeRecord({ phase: value, epoch }));
const countInto = target => frame => {
  for (const [name, count] of Object.entries(frame)) target[name] = (target[name] ?? 0) + count;
};
const plugin = nativeModuleCompilerPlugin({ root: rootPath, compilerBinary: binary });
const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
let first, second, fork, three, failed, queue, primaryError;
try {
  await mkdir(artifact, { recursive: true });
  const sourcePath = path.join(artifact, "authored.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  const compilerSha256 = sha(await readFile(binary));
  const transformed = await plugin.transform.call(context, source, sourcePath);
  assert.ok(transformed?.code, "actual Rust/OXC transform missing");
  await writeFile(path.join(artifact, "transformed.tsx"), transformed.code, { flag: "wx" });
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const registrations = new Map(), plans = [];
  visit(ast, node => {
    if (node.type !== "CallExpression") return;
    if (node.callee?.name === "__registerNativeSemanticPlan") plans.push(node);
    if (!/^__nativeDefineComponent_*$/.test(node.callee?.name ?? "")) return;
    const id = literal(node.arguments[0]);
    if (id) registrations.set(id.split("#component:").at(-1),
      { id, metadata: node.arguments[2] });
  });
  assert.equal(plans.length, 1);
  const revision = literal(property(plans[0].arguments[0], "module_revision"));
  assert.match(revision, /^native-v1-[a-f0-9]+$/);
  const proofs = [];
  for (const [name, props] of [
    ["Motion", ["data-value"]], ["Alternate", ["data-value"]],
    ["ThreeMotion", ["rotation-y"]],
  ]) {
    const registration = registrations.get(name);
    assert.ok(registration, `${name} registration missing`);
    const program = property(registration.metadata, "closedStoreHostProgram");
    const execution = property(registration.metadata, "closedStoreExecution");
    assert.equal(property(registration.metadata, "closedStoreNumericKernel"), null);
    assert.equal(literal(property(program, "schemaVersion")), 7);
    assert.equal(literal(property(execution, "schemaVersion")), 3);
    assert.equal(literal(property(execution, "kind")), "owned-data");
    assert.equal(execution.properties.length, 5);
    assert.equal(property(execution, "batchKernel")?.type, "ArrowFunctionExpression");
    assert.equal(property(execution, "numericKernel"), null);
    for (const owner of [program, execution]) {
      assert.equal(literal(property(owner, "componentProgramId")), registration.id);
      assert.equal(literal(property(owner, "moduleRevision")), revision);
    }
    assert.equal(literal(property(program, "retainedChildProp")), "children");
    assert.deepEqual(property(program, "stateSites")?.elements?.map(literal),
      [`${registration.id}#state:0`]);
    assert.deepEqual(property(program, "effectSites")?.elements?.map(literal),
      [`${registration.id}#effect:0`]);
    assert.deepEqual(property(program, "inputs")?.elements?.flatMap(input =>
      property(input, "paths")?.elements?.map(item => item.elements.map(literal)) ?? []),
      [["phase"], ["epoch"]]);
    assert.deepEqual(property(property(program, "host"), "props")?.elements
      ?.map(item => literal(item.elements?.[0])), props);
    const programObject = Function(`"use strict"; return (${transformed.code.slice(program.start, program.end)});`)();
    const rawExecution = Function(`"use strict"; return (${transformed.code.slice(execution.start, execution.end)});`)();
    const normalizedHost = normalizeClosedStoreHostProgram(programObject);
    assert.ok(normalizedHost);
    const owned = normalizeClosedStoreDataExecution(rawExecution, normalizedHost);
    assert.equal(inspectClosedStoreDataExecution(owned)?.mode, "verified-batch");
    assert.ok(owned);
    const values = evaluateClosedStoreDataExecution(owned, [3, 4, 2]);
    assert.deepEqual(values, programObject.host.props.map(([name, expression]) =>
      [name, evaluateClosedHostValue(expression, [3, 4, 2])]));
    proofs.push({ name, id: registration.id, revision, propNames: props });
  }
  const emitted = await transformWithOxc(transformed.code, sourcePath,
    { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
  const outputPath = path.join(artifact, "compiled.mjs");
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  await writeFile(path.join(artifact, "provenance.json"), JSON.stringify({
    compilerSha256, sourceSha256: sha(source), transformedSha256: sha(transformed.code),
    emittedSha256: sha(emitted.code), proofs,
  }, null, 2) + "\n", { flag: "wx" });
  const app = await import(pathToFileURL(outputPath).href);
  class ReentrantHost extends MemoryVDOMHost {
    onWrite;
    fail = false;
    overrideSet = 0;
    setProp(node, name, value, previous) {
      super.setProp(node, name, value, previous);
      if (name === "data-value") {
        this.overrideSet++;
        const callback = this.onWrite;
        this.onWrite = undefined;
        callback?.();
        if (this.fail) throw new Error("closed-contraction-partial-host-write");
      }
    }
  }
  class PublicCallbackWorld extends OwnerStateWorld {
    onScalarSource;
    scalarSourceForCell(handle) {
      const callback = this.onScalarSource;
      this.onScalarSource = undefined;
      callback?.();
      return super.scalarSourceForCell(handle);
    }
  }
  const hostA = new ReentrantHost(), containerA = hostA.createContainer();
  const hostB = new MemoryVDOMHost(), containerB = hostB.createContainer();
  const worldB = new PublicCallbackWorld();
  const counters = {};
  first = createNativeRoot(hostA, containerA,
    { rootId: `contraction-a-${randomUUID()}`, scheduleCommit() {},
      profileCounter: countInto(counters) });
  second = createNativeRoot(hostB, containerB,
    { rootId: `contraction-b-${randomUUID()}`, world: worldB, scheduleCommit() {} });
  const tree = (id, childKey = "first", alternate = false) =>
    jsx(app.DomApp, { id, childKey, alternate });
  first.mount(tree("a")); second.mount(tree("b"));
  const hostF = new MemoryVDOMHost(), containerF = hostF.createContainer();
  fork = createNativeRoot(hostF, containerF,
    { rootId: `contraction-fork-${randomUUID()}`, scheduleCommit() {} });
  fork.mount(tree("fork"));
  const scene = new THREE.Scene();
  three = createThreeNativeRoot(scene, { namespace: THREE, rootOptions: {
    rootId: `contraction-three-${randomUUID()}`, scheduleCommit() {},
  } });
  three.root.mount(jsx(app.ThreeApp, {}));
  const outputA = containerA.children[0].children[0], childA = outputA.children[0];
  const outputB = containerB.children[0].children[0];
  const mesh = scene.children[0]?.children[0]?.children[0];
  assert.ok(mesh instanceof THREE.Mesh);
  const geometry = mesh.geometry, material = mesh.material;
  const disposal = { geometry: 0, material: 0 };
  geometry.addEventListener("dispose", () => disposal.geometry++);
  material.addEventListener("dispose", () => disposal.material++);
  const event = childA.props.onClick;
  event(); assert.equal(app.trace.clicks, 1);
  const renders = counters["owner.component-renders"] ?? 0;
  assert.equal(app.trace.controls.a(1), true, "local control did not stage");
  for (const value of [1, 2, 2]) {
    phase(app, value);
    assert.equal(first.flush(), true);
    assert.equal(containerA.children[0].children[0], outputA);
    assert.equal(outputA.children[0], childA);
    assert.equal(outputA.props["data-value"], (value + 1) * 2);
  }
  assert.equal(counters["owner.component-renders"] ?? 0, renders,
    "ordinary closed cuts rerendered owners");
  assert.equal(childA.props.onClick, event, "retained control identity changed");
  assert.equal(app.trace.controls.three(2), true);
  assert.equal(three.root.flush(), true);
  assert.equal(scene.children[0].children[0].rotation.y, .04);
  assert.equal(mesh.geometry, geometry); assert.equal(mesh.material, material);
  assert.deepEqual(disposal, { geometry: 0, material: 0 });
  assert.equal(find(containerF, node => node.props?.["data-value"] === 0)?.tag, "div",
    "fork advanced without accepting its own Store history");

  phase(app, 3);
  const beforeGroup = [first.publicationVersion, second.publicationVersion];
  const snapshots = [JSON.stringify(first.snapshot), JSON.stringify(second.snapshot)];
  const writes = [hostA.writeCount, hostB.writeCount];
  let cutA, cutB;
  let laterPublicCalls = 0;
  try {
    cutA = first.prepareStores([app.clock]);
    cutB = second.prepareStores([app.clock]);
    assert.ok(cutA && cutB, "compiled candidates did not prepare");
    assert.equal(cutA.validate(), true);
    worldB.onScalarSource = () => {
      laterPublicCalls++;
      assert.equal(app.trace.controls.a(2), true);
    };
    assert.equal(cutB.validate(), true,
      "later root's public callback changed its own prepared inputs");
    assert.equal(admitPreparedNativeGroup([cutA, cutB]), false,
      "final private group admission missed newer local input in earlier root");
  } finally {
    cutA?.discard(); cutB?.discard();
  }
  assert.ok(laterPublicCalls > 0, "later root public validation did not run");
  assert.deepEqual([first.publicationVersion, second.publicationVersion], beforeGroup);
  assert.deepEqual([JSON.stringify(first.snapshot), JSON.stringify(second.snapshot)], snapshots);
  assert.deepEqual([hostA.writeCount, hostB.writeCount], writes);
  assert.equal(first.flush(), true, "newer local and Store inputs did not flush");
  assert.equal(outputA.props["data-value"], 10);
  assert.equal(outputB.props["data-value"], 0,
    "second root advanced without accepting its Store history");
  phase(app, 4);
  const heldBefore = [first.publicationVersion, second.publicationVersion];
  queue = new NativeRootWorkQueue({ maxStaleRetries: 0 });
  const accepted = queue.enqueueStores({ id: `contraction-held-${randomUUID()}`,
    roots: [{ root: first, stores: [app.clock] }, { root: second, stores: [app.clock] }],
    pending: ["ready"], onStaleWork: () => "reject",
  });
  assert.equal(accepted.status, "pending");
  assert.deepEqual([first.publicationVersion, second.publicationVersion], heldBefore);
  accepted.resolve("ready");
  assert.equal(accepted.status, "committed");
  assert.deepEqual([first.publicationVersion, second.publicationVersion],
    heldBefore.map(value => value + 1));
  assert.equal(outputA.props["data-value"], 12);
  assert.equal(outputB.props["data-value"], 8);
  assert.equal(find(containerF, node => node.props?.["data-value"] === 0)?.tag, "div");

  first.update(tree("a", "replacement"));
  const replacement = containerA.children[0].children[0].children[0];
  assert.notEqual(replacement, childA, "generic child replacement retained old child");
  phase(app, 5); first.flush();
  assert.equal(containerA.children[0].children[0].children[0], replacement);
  first.update(tree("a", "replacement", true));
  const alternateOutput = containerA.children[0].children[0];
  assert.notEqual(alternateOutput, outputA, "new program reused old owner output");
  phase(app, 6); first.flush();
  assert.equal(alternateOutput.props["data-value"], 6);
  phase(app, 7);
  const explicit = first.prepareStores([app.clock]);
  assert.ok(explicit, "explicit compiled Store cut declined");
  phase(app, 8);
  assert.throws(() => explicit.commitHost(), /stale/,
    "later public commit accepted an obsolete capture");
  first.flush();
  assert.equal(alternateOutput.props["data-value"], 8);
  hostA.onWrite = () => phase(app, 10);
  phase(app, 9); first.flush();
  assert.equal(alternateOutput.props["data-value"], 9);
  assert.equal(app.clock.getState().phase, 10);
  first.flush();
  assert.equal(alternateOutput.props["data-value"], 10,
    "older exact acknowledgement consumed newer host-time action");
  assert.equal(fork.flush(), true);
  assert.equal(containerF.children[0].children[0].props["data-value"], 20);

  const failingHost = new ReentrantHost(), failingContainer = failingHost.createContainer();
  failed = createNativeRoot(failingHost, failingContainer,
    { rootId: `contraction-failed-${randomUUID()}`, scheduleCommit() {} });
  failed.mount(tree("failed"));
  const oldVersion = failed.publicationVersion, oldSnapshot = JSON.stringify(failed.snapshot);
  phase(app, 11);
  const partial = failed.prepareStores([app.clock]);
  assert.ok(partial);
  failingHost.fail = true;
  assert.throws(() => partial.commitHost(), /closed-contraction-partial-host-write/);
  assert.equal(failed.publicationVersion, oldVersion);
  assert.equal(JSON.stringify(failed.snapshot), oldSnapshot,
    "partial host failure advanced accepted history");
  assert.throws(() => failed.flush(), /host|failed|quarantined/i,
    "failed publication domain accepted another flush");

  queue.dispose(); queue = null;
  first.dispose(); first = null;
  second.dispose(); second = null;
  fork.dispose(); fork = null;
  failed.dispose(); failed = null;
  three.dispose();
  assert.deepEqual(disposal, { geometry: 1, material: 1 },
    "retained Three resources did not dispose exactly once");
  assert.equal(three.host.diagnostics.liveResources, 0);
  assert.equal(three.host.diagnostics.createdResources, 2);
  assert.equal(three.host.diagnostics.disposedResources, 2);
  three = null;
  assert.deepEqual([containerA.children.length, containerB.children.length,
    containerF.children.length, failingContainer.children.length, scene.children.length],
    [0, 0, 0, 0, 0]);
  for (const id of ["a", "b", "fork", "failed", "three"])
    assert.ok(app.trace.cleanups[id] >= 1, `${id} activation cleanup missing`);
  await writeFile(path.join(artifact, "result.json"), JSON.stringify({ status: "PASS",
    proofs, laterPublicCalls, cleanups: app.trace.cleanups,
    assertions: { actualSchema7AndOwnedData: true, sharedStoreLocalAndRetainedChildren: true,
      groupFinalAdmission: true, forkReentryAndExactAck: true,
      partialFailureOldAcceptance: true },
  }, null, 2) + "\n", { flag: "wx" });
  console.log(`PASS compiled closed Store contraction; provenance: ${artifact}`);
} catch (error) { primaryError = error; }
const cleanupErrors = [];
for (const dispose of [() => queue?.dispose(), () => first?.dispose(),
  () => second?.dispose(), () => fork?.dispose(), () => failed?.dispose(),
  () => three?.dispose(), () => plugin.closeBundle()]) {
  try { await dispose(); } catch (error) { cleanupErrors.push(error); }
}
if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors],
  "Compiled closed Store contraction and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors,
  "Compiled closed Store contraction cleanup failed");
