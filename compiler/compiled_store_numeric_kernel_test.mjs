import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { transformWithOxc } from "vite";
import * as THREE from "three";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { createNativeRoot, jsx, storeRecord } from "../src/native_runtime_api.ts";
import { evaluateClosedStoreHostProgram, normalizeClosedStoreHostProgram } from "../src/closed_store_host_program.ts";
import { normalizeClosedStoreDataExecution, evaluateClosedStoreDataExecution } from "../src/closed_store_execution.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const rootPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeUrl = pathToFileURL(path.join(rootPath, "src/native_runtime_api.ts")).href;
const binary = path.join(rootPath, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const artifact = path.join(rootPath, ".cache", `compiled-store-numeric-kernel-${randomUUID()}`);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const source = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, storeRecord, use, useEffect, useState, jsx } from ${JSON.stringify(runtimeUrl)};
export const clock = createStore(storeRecord({ phase: 0, epoch: 0 }));
export const trace = { controls: {}, cleanups: {}, renders: 0, clicks: 0, opaqueCalls: 0 };
export function opaque(value) { trace.opaqueCalls++; return value; }
export function Motion(props) {
  const frame = use(props.clock);
  return <div key="motion" data-a={((frame.phase + 1) * (frame.epoch + 2)) + 3}
    data-b={((frame.phase + 1) * (frame.epoch + 2)) - 4}
    data-sign={frame.phase * 1}>{props.children}</div>;
}
export function Alternate(props) {
  const frame = use(props.clock);
  return <div key="alternate" data-a={frame.phase * 2} data-b={frame.epoch + 7}>{props.children}</div>;
}
export function Child(props) {
  trace.renders++;
  const [count, setCount] = useState(0);
  useEffect(() => { trace.controls[props.id] = setCount;
    return () => { trace.cleanups[props.id] = (trace.cleanups[props.id] ?? 0) + 1; }; });
  return <button key="child" data-id={props.id} data-count={count}
    onClick={() => { trace.clicks++; }}>child</button>;
}
export function Opaque(props) {
  const frame = use(props.clock);
  return <i key="opaque" data-value={opaque(frame.phase)} />;
}
export function DomApp() {
  return <section key="scene">{["a", "b", "c", "d"].map(id =>
    <section key={id}>{id === "c"
      ? <Alternate key="motion" clock={clock}><Child key="child" id={id} /></Alternate>
      : <Motion key="motion" clock={clock}><Child key="child" id={id} /></Motion>}
    </section>)}</section>;
}
export function FallbackApp() { return <section><Opaque key="opaque-owner" clock={clock} /></section>; }
export function ThreeMotion(props) {
  const frame = use(props.clock);
  return <group key="motion" rotation-y={((frame.phase + 1) * (frame.epoch + 2)) * .01}
    rotation-z={((frame.phase + 1) * (frame.epoch + 2)) * .02}>{props.children}</group>;
}
export function ThreeApp() {
  return <group key="scene"><ThreeMotion key="motion" clock={clock}>
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
const all = (node, result = []) => {
  result.push(node); for (const child of node.children ?? []) all(child, result); return result;
};
const find = (node, predicate) => all(node).find(predicate);
const counters = {}, threeCounters = {};
const countInto = target => frame => {
  for (const [name, count] of Object.entries(frame)) target[name] = (target[name] ?? 0) + count;
};
const plugin = nativeModuleCompilerPlugin({ root: rootPath, compilerBinary: binary });
const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
let dom, fork, fallback, three, primaryError;
try {
  await mkdir(artifact, { recursive: true });
  const sourcePath = path.join(artifact, "authored.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  const compilerSha256 = sha(await readFile(binary));
  const transformed = await plugin.transform.call(context, source, sourcePath);
  assert.ok(transformed?.code, "actual Rust/OXC transform must emit a module");
  await writeFile(path.join(artifact, "transformed.tsx"), transformed.code, { flag: "wx" });
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const registrations = new Map(), planCalls = [];
  visit(ast, node => {
    if (node.type === "CallExpression" && node.callee?.name === "__registerNativeSemanticPlan")
      planCalls.push(node);
    if (node.type !== "CallExpression" || !/^__nativeDefineComponent_*$/.test(node.callee?.name ?? "")) return;
    const id = literal(node.arguments[0]);
    if (id) registrations.set(id.split("#component:").at(-1), { id, metadata: node.arguments[2] });
  });
  assert.equal(planCalls.length, 1);
  const revision = literal(property(planCalls[0].arguments[0], "module_revision"));
  assert.match(revision, /^native-v1-[a-f0-9]+$/);
  const proofs = [];
  for (const name of ["Motion", "Alternate", "ThreeMotion"]) {
    const registration = registrations.get(name);
    assert.ok(registration, `${name} registration missing`);
    const program = property(registration.metadata, "closedStoreHostProgram");
    const execution = property(registration.metadata, "closedStoreExecution");
    assert.equal(property(registration.metadata, "closedStoreNumericKernel"), null);
    assert.equal(literal(property(program, "schemaVersion")), 6);
    assert.equal(literal(property(execution, "schemaVersion")), 1);
    assert.equal(literal(property(execution, "kind")), "owned-data");
    assert.equal(execution.properties.length, 4);
    assert.equal(literal(property(program, "componentProgramId")), registration.id);
    assert.equal(literal(property(execution, "componentProgramId")), registration.id);
    assert.equal(literal(property(program, "moduleRevision")), revision);
    assert.equal(literal(property(execution, "moduleRevision")), revision);
    const inputs = property(program, "inputs")?.elements;
    assert.equal(inputs?.length, 1);
    assert.equal(literal(property(inputs[0], "storeProp")), "clock");
    assert.deepEqual(property(inputs[0], "paths")?.elements?.map(item =>
      item.elements.map(literal)), [["phase"], ["epoch"]]);
    const propNames = property(property(program, "host"), "props")?.elements
      ?.map(item => literal(item.elements?.[0]));
    const programObject = Function(`"use strict"; return (${transformed.code.slice(program.start, program.end)});`)();
    const rawExecution = Function(`"use strict"; return (${transformed.code.slice(execution.start, execution.end)});`)();
    const normalizedHost = normalizeClosedStoreHostProgram(programObject);
    assert.ok(normalizedHost);
    const owned = normalizeClosedStoreDataExecution(rawExecution, normalizedHost);
    assert.ok(owned, `${name} actual compiler data marker normalizes`);
    const inputRows = [[0, 0], [2, 3], [-0, 0], [5, -2]];
    for (const row of inputRows) {
      const oracle = evaluateClosedStoreHostProgram(programObject, row);
      const actual = evaluateClosedStoreDataExecution(owned, row);
      assert.ok(oracle, `${name} evaluator accepts finite row`);
      assert.deepEqual(actual, oracle, `${name} differs from legacy evaluator`);
    }
    assert.equal(evaluateClosedStoreDataExecution(owned, [Infinity, 0]), null);
    if (name !== "Alternate") {
      assert.equal(evaluateClosedStoreDataExecution(owned, [1e308, 1e308]), null,
        "finite captured inputs with a nonfinite output must decline");
    }
    proofs.push({ name, id: registration.id, revision, inputCount: 2, propNames });
  }
  assert.equal(property(registrations.get("Opaque")?.metadata, "closedStoreNumericKernel"), null);
  await writeFile(path.join(artifact, "provenance.json"), JSON.stringify({ compilerSha256,
    sourceSha256: sha(source), transformedSha256: sha(transformed.code), proofs }, null, 2) + "\n", { flag: "wx" });
  const emitted = await transformWithOxc(transformed.code, sourcePath,
    { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
  const outputPath = path.join(artifact, "compiled.mjs");
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  const app = await import(pathToFileURL(outputPath).href);
  const host = new MemoryVDOMHost(), container = host.createContainer();
  dom = createNativeRoot(host, container, { rootId: `kernel-dom-${randomUUID()}`,
    scheduleCommit() {}, profileCounter: countInto(counters) });
  dom.mount(jsx(app.DomApp, {}));
  const children = Object.fromEntries(["a", "b", "c", "d"].map(id =>
    [id, find(container, node => node.props?.["data-id"] === id)]));
  const event = children.a?.props?.onClick;
  assert.equal(typeof event, "function"); event(); assert.equal(app.trace.clicks, 1);
  const setter = app.trace.controls.a;
  assert.equal(typeof setter, "function");
  const forkHost = new MemoryVDOMHost(), forkContainer = forkHost.createContainer();
  fork = createNativeRoot(forkHost, forkContainer,
    { rootId: `kernel-fork-${randomUUID()}`, scheduleCommit() {} });
  fork.mount(jsx(app.DomApp, {}));
  const fallbackHost = new MemoryVDOMHost(), fallbackContainer = fallbackHost.createContainer();
  fallback = createNativeRoot(fallbackHost, fallbackContainer,
    { rootId: `kernel-fallback-${randomUUID()}`, scheduleCommit() {} });
  fallback.mount(jsx(app.FallbackApp, {}));
  const scene = new THREE.Scene();
  three = createThreeNativeRoot(scene, { namespace: THREE, rootOptions: {
    rootId: `kernel-three-${randomUUID()}`, scheduleCommit() {}, profileCounter: countInto(threeCounters),
  } });
  three.root.mount(jsx(app.ThreeApp, {}));
  const mesh = scene.children[0]?.children[0]?.children[0];
  assert.ok(mesh instanceof THREE.Mesh);
  const geometry = mesh.geometry, material = mesh.material;
  const initialRenders = app.trace.renders;
  for (const key of Object.keys(counters)) delete counters[key];
  app.clock.dispatch(() => storeRecord({ phase: 2, epoch: 3 }));
  assert.equal(dom.flush(), true);
  assert.equal(counters["store.numeric-kernel.runs"] ?? 0, 0);
  assert.equal(counters["store.owned-data.rows"], 4);
  assert.equal(counters["store.owned-data.batches"], 1,
    "heterogeneous data owners must use the enclosed passive capture");
  for (const [id, expected] of [["a", 18], ["b", 18], ["c", 4], ["d", 18]]) {
    const motion = children[id]?.parent;
    assert.ok(motion);
    assert.equal(motion.props["data-a"], expected);
    assert.equal(find(container, node => node === children[id]), children[id]);
  }
  assert.equal(children.a.props.onClick, event);
  assert.equal(app.trace.renders, initialRenders);
  assert.equal(counters["owner.component-renders"] ?? 0, 0);
  assert.equal(find(forkContainer, node => node.props?.["data-a"] === 5)?.props?.["data-a"], 5,
    "fork keeps its accepted Store history");
  const opaqueCalls = app.trace.opaqueCalls;
  assert.equal(fallback.flush(), true);
  assert.ok(app.trace.opaqueCalls > opaqueCalls);
  assert.equal(three.root.flush(), true);
  assert.equal(threeCounters["store.owned-data.rows"], 1);
  assert.equal(mesh.geometry, geometry); assert.equal(mesh.material, material);
  setter(7); assert.equal(dom.flush(), true);
  assert.equal(children.a.props["data-count"], 7);
  dom.dispose(); dom = null; assert.equal(container.children.length, 0);
  fork.dispose(); fork = null; assert.equal(forkContainer.children.length, 0);
  fallback.dispose(); fallback = null; assert.equal(fallbackContainer.children.length, 0);
  three.dispose(); three = null; assert.equal(scene.children.length, 0);
  await writeFile(path.join(artifact, "result.json"), JSON.stringify({ status: "PASS", proofs,
    assertions: { actualRustOxcOwnedData: true, legacyDescriptorOracle: true, finiteSignedZeroOracle: true,
      mixedRuns: true, stateEventResourceForkFallback: true },
    boundary: "No timing claim; stale code, newer reentry and partial host failure have dedicated runtime gates." },
  null, 2) + "\n", { flag: "wx" });
  console.log(`PASS compiled Store owned numeric data; provenance: ${artifact}`);
} catch (error) { primaryError = error; }
const cleanupErrors = [];
try { dom?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { fork?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { fallback?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { three?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors],
  "Compiled Store numeric kernel fixture and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors,
  "Compiled Store numeric kernel cleanup failed");
