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
import { createThreeNativeRoot } from "../src/three_host.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeUrl = pathToFileURL(path.join(projectRoot, "src/native_runtime_api.ts")).href;
const compilerBinary = path.join(projectRoot, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const directory = path.join(projectRoot, ".cache", `compiled-structural-owner-scope-${randomUUID()}`);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const source = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, storeRecord, use, useEffect, useState, jsx } from ${JSON.stringify(runtimeUrl)};
export const clock = createStore(storeRecord({ phase: 0, epoch: 0 }));
export const trace = { childRenders: 0, controls: {}, cleanups: {}, clicks: {}, opaqueCalls: 0 };
export function opaque(value) { trace.opaqueCalls++; return value; }
export function DomMotion(props) {
  const frame = use(props.clock);
  return <div key="motion" data-phase={frame.phase} data-epoch={frame.epoch}>{props.children}</div>;
}
export function ThreeMotion(props) {
  const frame = use(props.clock);
  return <group key="motion" rotation-y={frame.phase * .42} rotation-z={frame.phase * .15}>{props.children}</group>;
}
export function Child(props) {
  trace.childRenders++;
  const [count, setCount] = useState(0);
  useEffect(() => {
    trace.controls[props.id] = setCount;
    return () => { if (trace.controls[props.id] === setCount) delete trace.controls[props.id];
      trace.cleanups[props.id] = (trace.cleanups[props.id] ?? 0) + 1; };
  });
  return <button key="child" data-id={props.id} data-count={count}
    onClick={() => { trace.clicks[props.id] = (trace.clicks[props.id] ?? 0) + 1; }}>child</button>;
}
export function OpaqueReader(props) {
  const frame = use(props.clock);
  return <i key="opaque" data-value={opaque(frame.phase)} />;
}
export function UnsafeChildren(props) {
  const child = props.children;
  const frame = use(props.clock);
  return <div key="unsafe" data-phase={frame.phase}>{child}</div>;
}
export function DomApp(props) {
  const names = props.reverse ? ["right", "left"] : ["left", "right"];
  const hosts = names.filter(id => id !== "left" || !props.omitLeft).map(id =>
    <div key={id === "right" && props.replaceRight ? "right-replaced" : id}>
      <DomMotion key="motion" clock={clock}>
        <Child key="child-owner" id={id} />
      </DomMotion>
    </div>);
  return <section key="scene">{[hosts]}</section>;
}
export function FallbackApp() {
  return <section key="fallback"><OpaqueReader key="opaque-reader" clock={clock} />
    <UnsafeChildren key="unsafe-reader" clock={clock}><b key="unsafe-child">unsafe</b></UnsafeChildren>
  </section>;
}
export function ThreeApp() {
  return <group key="scene">{["left", "right"].map(id =>
    <group key={id}><ThreeMotion key="motion" clock={clock}>
      {id === "left"
        ? <mesh key="retained" name="retained"><boxGeometry args={[1,1,1]} /><meshStandardMaterial color="orange" /></mesh>
        : <group key="retained" name="other-retained" />}
    </ThreeMotion></group>)}</group>;
}`;
const property = (node, name) => node?.type === "ObjectExpression" ?
  node.properties.find(entry => entry.type === "ObjectProperty" && !entry.computed &&
    (entry.key.name ?? entry.key.value) === name)?.value ?? null : null;
const literal = node => ["StringLiteral", "NumericLiteral"].includes(node?.type) ? node.value : null;
const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(child => visit(child, callback));
    else if (value && typeof value === "object") visit(value, callback);
  }
};
const locate = (node, predicate) => {
  if (!node) return null;
  if (predicate(node)) return node;
  for (const child of node.children ?? []) {
    const match = locate(child, predicate);
    if (match) return match;
  }
  return null;
};
const plugin = nativeModuleCompilerPlugin({ root: projectRoot, compilerBinary });
const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
let dom, fork, fallback, three, primaryError;
try {
  await mkdir(directory, { recursive: true });
  const sourcePath = path.join(directory, "structural-owner-scope.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  const compilerSha256 = sha(await readFile(compilerBinary));
  const transformed = await plugin.transform.call(context, source, sourcePath);
  assert.ok(transformed?.code, "actual Rust/OXC compilation succeeded");
  await writeFile(path.join(directory, "structural-owner-scope.transformed.tsx"), transformed.code, { flag: "wx" });
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const registrations = new Map();
  visit(ast, node => {
    if (node.type !== "CallExpression" || !/^__nativeDefineComponent_*$/.test(node.callee?.name ?? "")) return;
    const id = literal(node.arguments[0]);
    if (typeof id === "string") registrations.set(id.split("#component:").at(-1), { id, metadata: node.arguments[2] });
  });
  const proofs = [];
  for (const name of ["DomMotion", "ThreeMotion"]) {
    const registration = registrations.get(name);
    assert.ok(registration, `${name} actual compiled registration missing`);
    const program = property(registration.metadata, "closedStoreHostProgram");
    assert.equal(literal(property(program, "schemaVersion")), 6);
    assert.equal(literal(property(program, "componentProgramId")), registration.id);
    assert.equal(literal(property(program, "retainedChildProp")), "children");
    const inputs = property(program, "inputs")?.elements;
    assert.equal(inputs?.length, 1);
    assert.equal(literal(property(inputs[0], "storeProp")), "clock");
    assert.equal(literal(property(inputs[0], "storeUseSiteId")), `${registration.id}#store:0`);
    const host = property(program, "host");
    assert.equal(property(host, "child")?.type, "NullLiteral");
    assert.equal(literal(property(host, "key")), "motion");
    assert.equal(property(host, "props")?.elements?.length, 2);
    proofs.push({ name, id: registration.id, schemaVersion: 6 });
  }
  for (const name of ["OpaqueReader", "UnsafeChildren"])
    assert.equal(property(registrations.get(name)?.metadata, "closedStoreHostProgram"), null,
      `${name} must retain generic fallback`);
  await writeFile(path.join(directory, "provenance.json"), JSON.stringify({
    compilerSha256, sourceSha256: sha(source), transformedSha256: sha(transformed.code), proofs,
  }, null, 2) + "\n", { flag: "wx" });
  const emitted = await transformWithOxc(transformed.code, sourcePath, {
    lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" },
  });
  const outputPath = path.join(directory, "structural-owner-scope.mjs");
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  const app = await import(pathToFileURL(outputPath).href);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const counters = {};
  dom = createNativeRoot(host, container, { rootId: `scope-dom-${randomUUID()}`,
    scheduleCommit() {}, profileCounter(frame) {
      for (const [name, count] of Object.entries(frame)) counters[name] = (counters[name] ?? 0) + count;
    } });
  dom.mount(jsx(app.DomApp, {}));
  const leftSetter = app.trace.controls.left;
  const rightSetter = app.trace.controls.right;
  assert.equal(typeof leftSetter, "function");
  assert.equal(typeof rightSetter, "function");
  assert.notEqual(leftSetter, rightSetter, "equal component keys retain separate local state");
  const forkHost = new MemoryVDOMHost();
  const forkContainer = forkHost.createContainer();
  fork = createNativeRoot(forkHost, forkContainer, { rootId: `scope-fork-${randomUUID()}`,
    scheduleCommit() {} });
  fork.mount(jsx(app.DomApp, {}));
  const fallbackHost = new MemoryVDOMHost();
  const fallbackContainer = fallbackHost.createContainer();
  fallback = createNativeRoot(fallbackHost, fallbackContainer,
    { rootId: `scope-fallback-${randomUUID()}`, scheduleCommit() {} });
  fallback.mount(jsx(app.FallbackApp, {}));
  const scene = new THREE.Scene();
  const threeCounters = {};
  three = createThreeNativeRoot(scene, { namespace: THREE,
    rootOptions: { rootId: `scope-three-${randomUUID()}`, scheduleCommit() {},
      profileCounter(frame) {
        for (const [name, count] of Object.entries(frame))
          threeCounters[name] = (threeCounters[name] ?? 0) + count;
      } } });
  three.root.mount(jsx(app.ThreeApp, {}));
  const domMotions = [];
  const collect = node => {
    if (node?.props?.["data-phase"] === 0 && node.tag === "div") domMotions.push(node);
    for (const child of node?.children ?? []) collect(child);
  };
  collect(container);
  assert.equal(domMotions.length, 2, "two repeated-key retained wrappers mount");
  const left = domMotions[0], right = domMotions[1];
  const child = locate(left, node => node.props?.["data-id"] === "left");
  const rightChild = locate(right, node => node.props?.["data-id"] === "right");
  const event = child?.props?.onClick, rightEvent = rightChild?.props?.onClick;
  assert.ok(child && rightChild && typeof event === "function" && typeof rightEvent === "function");
  assert.notEqual(child, rightChild);
  event(); rightEvent();
  assert.equal(app.trace.clicks.left, 1); assert.equal(app.trace.clicks.right, 1);
  leftSetter(7);
  assert.equal(dom.flush(), true);
  assert.equal(child.props["data-count"], 7);
  assert.equal(rightChild.props["data-count"], 0,
    "left local setter cannot change equal-key right child");
  rightSetter(5);
  assert.equal(dom.flush(), true);
  assert.equal(child.props["data-count"], 7);
  assert.equal(rightChild.props["data-count"], 5,
    "right local setter changes only its structurally scoped child");
  const threeLeft = scene.children[0]?.children[0]?.children[0];
  const threeRight = scene.children[0]?.children[1]?.children[0];
  const mesh = threeLeft?.children[0];
  assert.ok(mesh instanceof THREE.Mesh && threeRight instanceof THREE.Group);
  const geometry = mesh.geometry, material = mesh.material;
  const initialChildRenders = app.trace.childRenders;
  for (const key of Object.keys(counters)) delete counters[key];
  for (const key of Object.keys(threeCounters)) delete threeCounters[key];
  const beforeOpaqueCalls = app.trace.opaqueCalls;
  app.clock.dispatch(() => storeRecord({ phase: 2, epoch: 1 }));
  assert.equal(dom.flush(), true);
  assert.equal(left.props["data-phase"], 2);
  assert.equal(right.props["data-epoch"], 1);
  assert.equal(locate(left, node => node.props?.["data-id"] === "left"), child);
  assert.equal(child.props.onClick, event);
  assert.equal(locate(right, node => node.props?.["data-id"] === "right"), rightChild);
  assert.equal(rightChild.props.onClick, rightEvent);
  assert.equal(app.trace.childRenders, initialChildRenders,
    "closed Store frame does not rerender child owners");
  assert.equal(counters["owner.component-renders"] ?? 0, 0,
    "closed Store frame does not rerender retained wrapper owners");
  assert.equal(fallback.flush(), true);
  assert.ok(app.trace.opaqueCalls > beforeOpaqueCalls, "opaque reader uses generic fallback");
  assert.equal(locate(fallbackContainer, node => node.props?.["data-phase"] === 2)?.props?.["data-phase"], 2,
    "unsafe child alias remains an honest generic fallback");
  assert.equal(locate(forkContainer, node => node.props?.["data-phase"] === 0)?.props?.["data-phase"], 0,
    "fork retains its accepted Store history");
  assert.equal(three.root.flush(), true);
  assert.equal(threeLeft.rotation.y, 2 * .42);
  assert.equal(threeRight.rotation.z, 2 * .15);
  assert.equal(mesh.geometry, geometry); assert.equal(mesh.material, material);
  assert.equal(threeCounters["owner.component-renders"] ?? 0, 0,
    "closed Store frame does not rerender Three wrapper owners");
  leftSetter(9);
  app.clock.dispatch(() => storeRecord({ phase: 3, epoch: 2 }));
  assert.equal(dom.flush(), true);
  assert.equal(child.props["data-count"], 9);
  assert.equal(rightChild.props["data-count"], 5);
  assert.equal(left.props["data-phase"], 3);
  assert.equal(locate(left, node => node.props?.["data-id"] === "left"), child);
  app.clock.dispatch(() => storeRecord({ phase: 4, epoch: 3 }));
  assert.equal(fork.flush(), true);
  assert.equal(locate(forkContainer, node => node.props?.["data-epoch"] === 3)?.props?.["data-phase"], 4);
  assert.equal(dom.flush(), true);
  assert.equal(left.props["data-phase"], 4);
  dom.update(jsx(app.DomApp, { reverse: true }));
  assert.equal(locate(container, node => node === left), left,
    "keyed outer-host move retains the left wrapper host");
  assert.equal(locate(container, node => node === right), right,
    "keyed outer-host move retains the right wrapper host");
  assert.equal(locate(left, node => node.props?.["data-id"] === "left"), child);
  assert.equal(locate(right, node => node.props?.["data-id"] === "right"), rightChild);
  assert.equal(child.props["data-count"], 9);
  assert.equal(rightChild.props["data-count"], 5);
  const leftCleanupsBeforeRemoval = app.trace.cleanups.left ?? 0;
  dom.update(jsx(app.DomApp, { reverse: true, omitLeft: true }));
  assert.equal(locate(container, node => node === left), null);
  assert.equal(locate(container, node => node === right), right);
  assert.ok((app.trace.cleanups.left ?? 0) > leftCleanupsBeforeRemoval,
    "removed owner runs its effect cleanup");
  dom.update(jsx(app.DomApp, { reverse: true }));
  const newLeftChild = locate(container, node => node.props?.["data-id"] === "left");
  assert.ok(newLeftChild && newLeftChild !== child, "reinsertion creates a new child host");
  assert.equal(newLeftChild.props["data-count"], 0, "reinserted owner starts fresh local state");
  assert.equal(locate(container, node => node === right), right);
  dom.update(jsx(app.DomApp, { reverse: true, replaceRight: true }));
  const newRightChild = locate(container, node => node.props?.["data-id"] === "right");
  assert.ok(newRightChild && newRightChild !== rightChild,
    "outer host key replacement retires the old descendant owner");
  assert.equal(newRightChild.props["data-count"], 0);
  assert.notEqual(newRightChild.props.onClick, rightEvent);
  dom.dispose(); dom = null;
  assert.equal(container.children.length, 0);
  fork.dispose(); fork = null;
  assert.equal(forkContainer.children.length, 0);
  fallback.dispose(); fallback = null;
  assert.equal(fallbackContainer.children.length, 0);
  three.dispose(); three = null;
  assert.equal(scene.children.length, 0);
  await writeFile(path.join(directory, "result.json"), JSON.stringify({ status: "PASS", proofs,
    assertions: { actualRustOxcSchema6: true, repeatedLiteralKeys: true, retainedChildIdentity: true,
      opaqueAndUnsafeFallback: true, independentChildUpdate: true, forkAcceptedHistory: true,
      ThreeResourceLifetime: true }, boundary: "No timing claim; reentry, partial failure and stale code remain separate runtime gates." },
  null, 2) + "\n", { flag: "wx" });
  console.log(`PASS compiled structural owner scope; provenance: ${directory}`);
} catch (error) { primaryError = error; }
const cleanupErrors = [];
try { dom?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { fork?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { fallback?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { three?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors],
  "Compiled structural owner scope fixture and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors,
  "Compiled structural owner scope cleanup failed");
