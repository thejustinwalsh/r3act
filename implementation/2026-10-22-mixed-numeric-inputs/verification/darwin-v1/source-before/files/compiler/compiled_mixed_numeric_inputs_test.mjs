import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { transformWithOxc } from "vite";
import * as THREE from "three";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { createNativeRoot, jsx, storeRecord } from "../src/native_runtime_api.ts";
import { evaluateClosedStoreHostProgram } from "../src/closed_store_host_program.ts";
import { evaluateClosedHostValue } from "../src/closed_host_value.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const rootPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeUrl = pathToFileURL(path.join(rootPath, "src/native_runtime_api.ts")).href;
const binary = path.join(rootPath, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const artifact = path.join(rootPath, ".cache", `compiled-mixed-numeric-inputs-${randomUUID()}`);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const source = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, storeRecord, use, useEffect, useState, jsx } from ${JSON.stringify(runtimeUrl)};
export const clock = createStore(storeRecord({ phase: 0, epoch: 0 }));
export const tuning = createStore(storeRecord({ gain: 2 }));
export const trace = { controls: {}, childControls: {}, cleanups: {}, activations: {}, renders: 0, clicks: 0, opaqueCalls: 0 };
export function opaque(value) { trace.opaqueCalls++; return value; }
export function Motion(props) {
  const frame = use(props.clock);
  const tune = use(props.tuning);
  const [offset, setOffset] = useState(0);
  const [trim, setTrim] = useState(1);
  useEffect(() => { trace.controls[props.id] = { offset: setOffset, trim: setTrim };
    trace.activations[props.id] = (trace.activations[props.id] ?? 0) + 1;
    return () => { trace.cleanups[props.id] = (trace.cleanups[props.id] ?? 0) + 1;
      delete trace.controls[props.id]; }; });
  const shared = (frame.phase + offset) * (tune.gain + trim);
  return <div key="motion" data-a={shared + frame.epoch} data-b={shared - trim}
    data-sign={offset * 1}>{props.children}</div>;
}
export const Alternate = props => {
  const frame = use(props.clock);
  const tune = use(props.tuning);
  const [offset, setOffset] = useState(0);
  useEffect(() => { trace.controls[props.id] = { offset: setOffset };
    trace.activations[props.id] = (trace.activations[props.id] ?? 0) + 1;
    return () => { trace.cleanups[props.id] = (trace.cleanups[props.id] ?? 0) + 1;
      delete trace.controls[props.id]; }; });
  return <div key="alternate" data-a={frame.phase * tune.gain + offset}
    data-b={frame.epoch + offset}>{props.children}</div>;
};
export function Child(props) {
  trace.renders++;
  const [count, setCount] = useState(0);
  useEffect(() => { trace.childControls[props.id] = setCount; });
  return <button key="child" data-id={props.id} data-count={count}
    onClick={() => { trace.clicks++; }}>child</button>;
}
export function Opaque(props) {
  const frame = use(props.clock);
  const [offset] = useState(0);
  return <i key="opaque" data-value={opaque(frame.phase + offset)} />;
}
export function DomApp() {
  return <section key="scene">{["a", "b", "c", "d"].map(id =>
    <section key={id}>{id === "c"
      ? <Alternate key="motion" id={id} clock={clock} tuning={tuning}><Child key="child" id={id} /></Alternate>
      : <Motion key="motion" id={id} clock={clock} tuning={tuning}><Child key="child" id={id} /></Motion>}
    </section>)}</section>;
}
export function FallbackApp() { return <section><Opaque key="opaque-owner" clock={clock} /></section>; }
export function ThreeMotion(props) {
  const frame = use(props.clock);
  const [offset, setOffset] = useState(0);
  useEffect(() => { trace.controls.three = { offset: setOffset }; return () => { trace.cleanups.three = (trace.cleanups.three ?? 0) + 1; }; });
  return <group key="motion" rotation-y={(frame.phase + offset) * .01}
    rotation-z={(frame.epoch + offset) * .02}>{props.children}</group>;
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
  for (const [name, paths, stateCount, props] of [
    ["Motion", [["phase"], ["epoch"], ["gain"]], 2, ["data-a", "data-b", "data-sign"]],
    ["Alternate", [["phase"], ["epoch"], ["gain"]], 1, ["data-a", "data-b"]],
    ["ThreeMotion", [["phase"], ["epoch"]], 1, ["rotation-y", "rotation-z"]],
  ]) {
    const registration = registrations.get(name);
    assert.ok(registration, `${name} registration missing`);
    const program = property(registration.metadata, "closedStoreHostProgram");
    const kernel = property(registration.metadata, "closedStoreNumericKernel");
    assert.equal(literal(property(program, "schemaVersion")), 7);
    assert.equal(literal(property(kernel, "schemaVersion")), 1);
    assert.equal(literal(property(program, "componentProgramId")), registration.id);
    assert.equal(literal(property(kernel, "componentProgramId")), registration.id);
    assert.equal(literal(property(program, "moduleRevision")), revision);
    assert.equal(literal(property(kernel, "moduleRevision")), revision);
    const inputs = property(program, "inputs")?.elements;
    assert.equal(inputs?.length, name === "ThreeMotion" ? 1 : 2);
    assert.deepEqual(inputs.flatMap(input => property(input, "paths")?.elements?.map(item =>
      item.elements.map(literal)) ?? []), paths, "Store projections precede state cells");
    assert.deepEqual(inputs.map(input => literal(property(input, "storeProp"))),
      name === "ThreeMotion" ? ["clock"] : ["clock", "tuning"]);
    const states = property(program, "stateSites")?.elements?.map(literal);
    assert.deepEqual(states, Array.from({ length: stateCount }, (_, i) => `${registration.id}#state:${i}`));
    const effects = property(program, "effectSites")?.elements?.map(literal);
    assert.deepEqual(effects, [`${registration.id}#effect:0`]);
    assert.equal(literal(property(program, "retainedChildProp")), "children");
    assert.equal(property(property(program, "host"), "child")?.type, "NullLiteral");
    assert.equal(literal(property(kernel, "inputCount")), paths.length + stateCount);
    assert.deepEqual(property(kernel, "propNames")?.elements?.map(literal), props);
    assert.deepEqual(property(property(program, "host"), "props")?.elements
      ?.map(item => literal(item.elements?.[0])), props);
    const expression = stripTypeScriptTypes(`(${transformed.code.slice(kernel.start, kernel.end)})`,
      { mode: "strip" });
    const executable = Function(`"use strict"; return ${expression};`)();
    const programObject = Function(`"use strict"; return (${transformed.code.slice(program.start, program.end)});`)();
    const rows = name === "Motion" ? [[0, 0, 2, 0, 1], [3, 4, 5, -2, 7]] :
      name === "Alternate" ? [[0, 0, 2, 0], [3, 4, 5, -2]] : [[0, 0, 0], [3, 4, -2]];
    const input = [99, ...rows.flat(), 98], output = Array(2 + rows.length * props.length + 2).fill(777);
    const written = executable.executeRange(input, 1, rows.length, output, 2);
    assert.equal(written, rows.length * props.length);
    assert.deepEqual(output.slice(0, 2), [777, 777]);
    assert.deepEqual(output.slice(2 + written), [777, 777]);
    for (let row = 0; row < rows.length; row++) {
      const oracle = programObject.host.props.map(([name, descriptor]) =>
        [name, evaluateClosedHostValue(descriptor, rows[row])]);
      for (let column = 0; column < props.length; column++)
        assert.ok(Object.is(output[2 + row * props.length + column], oracle[column][1]),
          `${name} row ${row}, ${props[column]} differs from descriptor evaluator`);
    }
    assert.equal(evaluateClosedStoreHostProgram(programObject, rows[0]), null,
      "schema 7 must require its associated kernel in production");
    proofs.push({ name, id: registration.id, revision, inputCount: paths.length + stateCount, props });
  }
  assert.equal(property(registrations.get("Opaque")?.metadata, "closedStoreHostProgram"), null);
  await writeFile(path.join(artifact, "provenance.json"), JSON.stringify({ compilerSha256,
    sourceSha256: sha(source), transformedSha256: sha(transformed.code), proofs }, null, 2) + "\n", { flag: "wx" });
  const emitted = await transformWithOxc(transformed.code, sourcePath,
    { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
  const outputPath = path.join(artifact, "compiled.mjs");
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  const app = await import(pathToFileURL(outputPath).href);
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const counters = {}, threeCounters = {};
  dom = createNativeRoot(host, container, { rootId: `mixed-dom-${randomUUID()}`,
    scheduleCommit() {}, profileCounter: countInto(counters) });
  dom.mount(jsx(app.DomApp, {}));
  const children = Object.fromEntries(["a", "b", "c", "d"].map(id =>
    [id, find(container, node => node.props?.["data-id"] === id)]));
  const motion = id => children[id]?.parent;
  const event = children.a?.props?.onClick;
  assert.equal(typeof event, "function"); event(); assert.equal(app.trace.clicks, 1);
  assert.equal(typeof app.trace.controls.a.offset, "function");
  const controls = Object.fromEntries(Object.entries(app.trace.controls)
    .map(([id, setters]) => [id, { ...setters }]));
  const childControl = app.trace.childControls.a;
  const forkHost = new MemoryVDOMHost(), forkContainer = forkHost.createContainer();
  fork = createNativeRoot(forkHost, forkContainer,
    { rootId: `mixed-fork-${randomUUID()}`, scheduleCommit() {} });
  fork.mount(jsx(app.DomApp, {}));
  const fallbackHost = new MemoryVDOMHost(), fallbackContainer = fallbackHost.createContainer();
  fallback = createNativeRoot(fallbackHost, fallbackContainer,
    { rootId: `mixed-fallback-${randomUUID()}`, scheduleCommit() {} });
  fallback.mount(jsx(app.FallbackApp, {}));
  const scene = new THREE.Scene();
  three = createThreeNativeRoot(scene, { namespace: THREE, rootOptions: {
    rootId: `mixed-three-${randomUUID()}`, scheduleCommit() {}, profileCounter: countInto(threeCounters),
  } });
  three.root.mount(jsx(app.ThreeApp, {}));
  const mesh = scene.children[0]?.children[0]?.children[0];
  assert.ok(mesh instanceof THREE.Mesh);
  const geometry = mesh.geometry, material = mesh.material;
  const initialRenders = app.trace.renders;
  for (const key of Object.keys(counters)) delete counters[key];
  assert.equal(controls.a.offset(2), true);
  assert.equal(dom.flush(), true);
  assert.equal(motion("a").props["data-a"], 6);
  assert.equal(motion("a").props["data-b"], 5);
  assert.equal(motion("b").props["data-a"], 0);
  assert.equal(counters["owner.component-renders"] ?? 0, 0);
  assert.equal(controls.b.offset(1), true);
  assert.equal(controls.c.offset(2), true);
  app.clock.dispatch(() => storeRecord({ phase: 3, epoch: 4 }));
  app.tuning.dispatch(() => storeRecord({ gain: 5 }));
  assert.equal(dom.flush(), true);
  assert.equal(motion("a").props["data-a"], 34);
  assert.equal(motion("b").props["data-a"], 28);
  assert.equal(motion("c").props["data-a"], 17);
  assert.equal(counters["store.numeric-kernel.rows"] >= 4, true);
  assert.equal(find(forkContainer, node => node.props?.["data-a"] === 0)?.props?.["data-a"], 0,
    "fork keeps its accepted Store history");
  const opaqueCalls = app.trace.opaqueCalls;
  assert.equal(fallback.flush(), true);
  assert.ok(app.trace.opaqueCalls > opaqueCalls);
  assert.equal(three.root.flush(), true);
  assert.equal(threeCounters["store.numeric-kernel.rows"] >= 1, true);
  assert.equal(mesh.geometry, geometry); assert.equal(mesh.material, material);
  assert.equal(controls.a.trim(7), true);
  assert.equal(controls.d.offset(-2), true);
  assert.equal(dom.flush(), true);
  assert.equal(motion("a").props["data-a"], 64);
  assert.equal(motion("d").props["data-a"], 10);
  assert.equal(children.a.props.onClick, event);
  assert.equal(app.trace.renders, initialRenders);
  assert.equal(counters["owner.component-renders"] ?? 0, 0);
  assert.equal(childControl(7), true);
  assert.equal(dom.flush(), true);
  assert.equal(children.a.props["data-count"], 7);
  const activations = { ...app.trace.activations };
  dom.dispose(); dom = null; assert.equal(container.children.length, 0);
  fork.dispose(); fork = null; assert.equal(forkContainer.children.length, 0);
  fallback.dispose(); fallback = null; assert.equal(fallbackContainer.children.length, 0);
  three.dispose(); three = null; assert.equal(scene.children.length, 0);
  for (const id of ["a", "b", "c", "d"])
    assert.equal(app.trace.cleanups[id], activations[id], `${id} activation cleanup balance`);
  await writeFile(path.join(artifact, "result.json"), JSON.stringify({ status: "PASS", proofs,
    assertions: { actualRustOxcSchema7: true, storeBeforeLocalInputs: true,
      localStoreJointNoRerender: true, retainedEventResourceForkFallback: true },
    boundary: "No timing claim; pending cuts, stale code/source, reentry and partial host failures have runtime gates." },
  null, 2) + "\n", { flag: "wx" });
  console.log(`PASS compiled mixed numeric inputs; provenance: ${artifact}`);
} catch (error) { primaryError = error; }
const cleanupErrors = [];
try { dom?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { fork?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { fallback?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { three?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors],
  "Compiled mixed numeric inputs fixture and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors,
  "Compiled mixed numeric inputs cleanup failed");
