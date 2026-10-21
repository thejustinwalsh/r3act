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
const directory = path.join(projectRoot, ".cache", `compiled-retained-store-clock-${randomUUID()}`);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const source = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, storeRecord, use, useEffect, useState, jsx } from ${JSON.stringify(runtimeUrl)};
export const clock = createStore(storeRecord({ phase: 0, epoch: 0 }));
export const trace = { childRenders: 0, setChild: null, clicks: 0, opaqueCalls: 0 };
export function opaque(value) { trace.opaqueCalls++; return value; }
export function DomMotion(props) {
  const frame = use(props.clock);
  return <div key="motion" data-phase={frame.phase} data-epoch={frame.epoch}>{props.children}</div>;
}
export function ThreeMotion(props) {
  const frame = use(props.clock);
  return <group key="motion" rotation-y={frame.phase * .42} rotation-z={frame.phase * .15}>{props.children}</group>;
}
export function Child() {
  trace.childRenders++;
  const [count, setCount] = useState(0);
  useEffect(() => { trace.setChild = setCount; });
  return <button key="child" data-count={count} onClick={() => { trace.clicks++; }}>child</button>;
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
export function DomApp() {
  return <section key="scene"><div key="left"><DomMotion key="motion" clock={clock}><Child key="child-owner" /></DomMotion></div>
    <div key="right"><DomMotion key="motion" clock={clock}><span key="stable">stable</span></DomMotion></div>
  </section>;
}
export function FallbackApp() {
  return <section key="fallback"><OpaqueReader key="opaque-reader" clock={clock} />
    <UnsafeChildren key="unsafe-reader" clock={clock}><b key="unsafe-child">unsafe</b></UnsafeChildren>
  </section>;
}
export function ThreeApp() {
  return <group key="scene"><group key="left"><ThreeMotion key="motion" clock={clock}>
    <mesh key="retained" name="retained"><boxGeometry args={[1,1,1]} /><meshStandardMaterial color="orange" /></mesh>
  </ThreeMotion></group><group key="right"><ThreeMotion key="motion" clock={clock}>
    <group key="retained" name="other-retained" />
  </ThreeMotion></group></group>;
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
  const sourcePath = path.join(directory, "retained-store-clock.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  const compilerSha256 = sha(await readFile(compilerBinary));
  const transformed = await plugin.transform.call(context, source, sourcePath);
  assert.ok(transformed?.code, "actual Rust/OXC compilation succeeded");
  await writeFile(path.join(directory, "retained-store-clock.transformed.tsx"), transformed.code, { flag: "wx" });
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
  const outputPath = path.join(directory, "retained-store-clock.mjs");
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  const app = await import(pathToFileURL(outputPath).href);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const counters = {};
  dom = createNativeRoot(host, container, { rootId: `clock-dom-${randomUUID()}`,
    scheduleCommit() {}, profileCounter(frame) {
      for (const [name, count] of Object.entries(frame)) counters[name] = (counters[name] ?? 0) + count;
    } });
  dom.mount(jsx(app.DomApp, {}));
  const primaryChildSetter = app.trace.setChild;
  assert.equal(typeof primaryChildSetter, "function");
  const forkHost = new MemoryVDOMHost();
  const forkContainer = forkHost.createContainer();
  fork = createNativeRoot(forkHost, forkContainer, { rootId: `clock-fork-${randomUUID()}`,
    scheduleCommit() {} });
  fork.mount(jsx(app.DomApp, {}));
  const fallbackHost = new MemoryVDOMHost();
  const fallbackContainer = fallbackHost.createContainer();
  fallback = createNativeRoot(fallbackHost, fallbackContainer,
    { rootId: `clock-fallback-${randomUUID()}`, scheduleCommit() {} });
  fallback.mount(jsx(app.FallbackApp, {}));
  const scene = new THREE.Scene();
  const threeCounters = {};
  three = createThreeNativeRoot(scene, { namespace: THREE,
    rootOptions: { rootId: `clock-three-${randomUUID()}`, scheduleCommit() {},
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
  const child = locate(left, node => node.tag === "button");
  const event = child?.props?.onClick;
  const text = locate(right, node => node.tag === "span");
  assert.ok(child && typeof event === "function" && text);
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
  assert.equal(locate(left, node => node.tag === "button"), child);
  assert.equal(child.props.onClick, event);
  assert.equal(locate(right, node => node.tag === "span"), text);
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
  primaryChildSetter(7);
  app.clock.dispatch(() => storeRecord({ phase: 3, epoch: 2 }));
  assert.equal(dom.flush(), true);
  assert.equal(child.props["data-count"], 7);
  assert.equal(left.props["data-phase"], 3);
  assert.equal(locate(left, node => node.tag === "button"), child);
  app.clock.dispatch(() => storeRecord({ phase: 4, epoch: 3 }));
  assert.equal(fork.flush(), true);
  assert.equal(locate(forkContainer, node => node.props?.["data-epoch"] === 3)?.props?.["data-phase"], 4);
  assert.equal(dom.flush(), true);
  assert.equal(left.props["data-phase"], 4);
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
  console.log(`PASS compiled retained Store clock; provenance: ${directory}`);
} catch (error) { primaryError = error; }
const cleanupErrors = [];
try { dom?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { fork?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { fallback?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { three?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors],
  "Compiled retained Store clock fixture and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors,
  "Compiled retained Store clock cleanup failed");
