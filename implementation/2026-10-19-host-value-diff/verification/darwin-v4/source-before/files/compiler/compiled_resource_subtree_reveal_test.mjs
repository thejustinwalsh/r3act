import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { transformWithOxc } from "vite";
import * as THREE from "three";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeUrl = pathToFileURL(path.join(projectRoot, "src/native_runtime_api.ts")).href;
const directory = path.join(projectRoot, ".cache", `compiled-resource-subtree-${randomUUID()}`);
const authored = (kind) => kind === "dom" ? `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, Suspense, use, useState, useEffect, createStore, jsx } from ${JSON.stringify(runtimeUrl)};
export function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
export const oldA = deferred(), nextA = deferred(), pendingB = deferred();
export const resourceB = new AsyncResource(pendingB.promise);
export const mode = createStore(0, (_current, next) => next);
export const trace = { fallbackMounts: 0, fallbackCleanups: 0, fallbackSetter: null };
export function A() { const value = use(use(mode) === 0 ? oldA.promise : nextA.promise); return <div key="a-host" data-a="primary">{value}</div>; }
export function FallbackB() {
  const [, setValue] = useState(1);
  useEffect(() => { trace.fallbackSetter = setValue; trace.fallbackMounts++;
    return () => { trace.fallbackCleanups++; if (trace.fallbackSetter === setValue) trace.fallbackSetter = null; }; });
  return <span key="b-root" data-b="fallback">B waiting</span>;
}
export function B(props) { const value = use(props.resource); return <div key="b-root" data-b="ready"><span key="b-label" data-label="ready">{value}</span><output key="b-output" data-count={value + 1}>{value}</output></div>; }
export function App() { return <section>
  <Suspense fallback={<div key="a-host" data-a="fallback">A waiting</div>}><A key="a-child" /></Suspense>
  <Suspense fallback={<FallbackB key="b-fallback-owner" />}><B key="b-child" resource={resourceB} /></Suspense>
</section>; }
` : `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, Suspense, use, useState, useEffect, createStore, jsx } from ${JSON.stringify(runtimeUrl)};
export function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
export const oldA = deferred(), nextA = deferred(), pendingB = deferred();
export const resourceB = new AsyncResource(pendingB.promise);
export const mode = createStore(0, (_current, next) => next);
export const trace = { fallbackMounts: 0, fallbackCleanups: 0, fallbackSetter: null };
export function A() { const value = use(use(mode) === 0 ? oldA.promise : nextA.promise); return <group key="a-host" name={value} />; }
export function FallbackB() {
  const [, setValue] = useState(1);
  useEffect(() => { trace.fallbackSetter = setValue; trace.fallbackMounts++;
    return () => { trace.fallbackCleanups++; if (trace.fallbackSetter === setValue) trace.fallbackSetter = null; }; });
  return <mesh key="b-root" name="waiting"><boxGeometry /><meshStandardMaterial /></mesh>;
}
export function B(props) { const value = use(props.resource); return <group key="b-root" name="ready"><mesh key="b-mesh" position-x={value + 1} /><group key="b-child" name="static" /></group>; }
export function App() { return <group key="scene-root">
  <Suspense fallback={<group key="a-host" name="A waiting" />}><A key="a-child" /></Suspense>
  <Suspense fallback={<FallbackB key="b-fallback-owner" />}><B key="b-child" resource={resourceB} /></Suspense>
</group>; }
`;

const property = (node, name) => node?.type === "ObjectExpression" ?
  node.properties.find((entry) => entry.type === "ObjectProperty" && !entry.computed &&
    (entry.key.name ?? entry.key.value) === name)?.value : null;
const literal = (node) => node?.type === "StringLiteral" || node?.type === "NumericLiteral" ? node.value : null;
const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
    if (Array.isArray(value)) value.forEach((entry) => visit(entry, callback));
    else if (value && typeof value === "object") visit(value, callback);
  }
};
const registration = (ast, name) => {
  const aliases = new Set();
  for (const statement of ast.program.body) {
    if (statement.type !== "ImportDeclaration" ||
      !String(statement.source.value).includes("native_runtime_api")) continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type === "ImportSpecifier" &&
        (specifier.imported.name ?? specifier.imported.value) === "defineComponent") {
        aliases.add(specifier.local.name);
      }
    }
  }
  const found = [];
  visit(ast, (node) => {
    if (node.type === "CallExpression" && node.callee.type === "Identifier" &&
      aliases.has(node.callee.name) && literal(node.arguments[0])?.endsWith(`#component:${name}`)) {
      found.push(node);
    }
  });
  assert.equal(found.length, 1, `${name} needs exactly one compiled registration`);
  return found[0];
};
const settleFlush = async (root) => {
  for (let index = 0; index < 5; index++) await new Promise((done) => setTimeout(done, 0));
  root.flush();
};
const locate = (node, predicate) => predicate(node) ? node :
  node.children.map((child) => locate(child, predicate)).find(Boolean);
const treeText = (node) => (node.text ?? "") + node.children.map(treeText).join("");
const plugin = nativeModuleCompilerPlugin({ root: projectRoot,
  compilerBinary: path.join(projectRoot, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike") });
const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
const roots = [];
const results = [];
let primaryError;
let directoryCreated = false;
try {
  await mkdir(directory, { recursive: true });
  directoryCreated = true;
  for (const kind of ["dom", "three"]) {
    const sourcePath = path.join(directory, `resource-${kind}.tsx`);
    const transformPath = path.join(directory, `resource-${kind}.transformed.tsx`);
    const outputPath = path.join(directory, `resource-${kind}.mjs`);
    await writeFile(sourcePath, authored(kind), { flag: "wx" });
    const transformed = await plugin.transform.call(context, authored(kind), sourcePath);
    assert.ok(transformed?.code, `${kind} source did not compile through Rust/OXC`);
    await writeFile(transformPath, transformed.code, { flag: "wx" });
    const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
    const bRegistration = registration(ast, "B");
    assert.equal(bRegistration.arguments[1]?.name, "B");
    const bId = literal(bRegistration.arguments[0]);
    const program = property(bRegistration.arguments[2], "closedResourceHostProgram");
    const host = property(program, "host");
    const children = property(host, "children")?.elements ?? [];
    const planCalls = [], invalidations = [], bReads = [];
    const useAtAliases = new Set();
    for (const statement of ast.program.body) {
      if (statement.type !== "ImportDeclaration" ||
        !String(statement.source.value).includes("native_runtime_api")) continue;
      for (const specifier of statement.specifiers) {
        if (specifier.type === "ImportSpecifier" &&
          (specifier.imported.name ?? specifier.imported.value) === "useAt") {
          useAtAliases.add(specifier.local.name);
        }
      }
    }
    visit(ast, (node) => {
      if (node.type !== "CallExpression" || node.callee.type !== "Identifier") return;
      if (node.callee.name === "__registerNativeSemanticPlan") planCalls.push(node);
      if (node.callee.name === "__invalidateNativeSemanticPlan") invalidations.push(node);
    });
    let bFunction;
    visit(ast, (node) => {
      if (node.type === "FunctionDeclaration" && node.id?.name === "B") bFunction = node;
    });
    visit(bFunction?.body, (node) => {
      if (node.type === "CallExpression" && node.callee.type === "Identifier" &&
        useAtAliases.has(node.callee.name)) bReads.push(node);
    });
    assert.equal(planCalls.length, 1);
    assert.equal(invalidations.length, 1);
    const semantic = planCalls[0].arguments[0];
    const moduleRevision = literal(property(semantic, "module_revision"));
    const sourceFile = literal(property(semantic, "source_file"));
    assert.match(moduleRevision ?? "", /^native-v1-[a-f0-9]+$/);
    assert.ok(bId?.startsWith(`${sourceFile}#component:`));
    assert.equal(literal(invalidations[0].arguments[0]), sourceFile);
    assert.equal(literal(invalidations[0].arguments[1]), moduleRevision);
    assert.equal(literal(property(program, "moduleRevision")), moduleRevision);
    assert.equal(bReads.length, 1);
    assert.equal(literal(bReads[0].arguments[0]), literal(property(program, "resourceUseSiteId")));
    assert.equal(bReads[0].arguments[1]?.type, "MemberExpression");
    assert.equal(bReads[0].arguments[1].object?.name, "props");
    assert.equal(bReads[0].arguments[1].property?.name, "resource");
    assert.equal(literal(property(program, "schemaVersion")), 2);
    assert.equal(literal(property(program, "componentProgramId")), bId);
    assert.ok(literal(property(program, "resourceUseSiteId")));
    assert.equal(literal(property(program, "resourceProp")), "resource");
    assert.equal(literal(property(host, "key")), "b-root");
    assert.equal(literal(property(host, "tag")), kind === "dom" ? "div" : "group");
    assert.equal(children.length, 2, `${kind} subtree has no two emitted children`);
    assert.deepEqual(children.map((child) => literal(property(child, "kind"))), ["host", "host"]);
    assert.deepEqual(children.map((child) => literal(property(property(child, "host"), "key"))),
      kind === "dom" ? ["b-label", "b-output"] : ["b-mesh", "b-child"]);
    const countHost = property(children[kind === "dom" ? 1 : 0], "host");
    const countProps = property(countHost, "props")?.elements ?? [];
    const countExpression = countProps.find((pair) => literal(pair?.elements?.[0]) ===
      (kind === "dom" ? "data-count" : "position-x"))?.elements?.[1];
    assert.equal(literal(property(countExpression, "kind")), "binary");
    assert.equal(literal(property(countExpression, "operator")), "+");
    assert.equal(literal(property(property(countExpression, "left"), "index")), 0);
    assert.equal(literal(property(property(countExpression, "right"), "value")), 1);
    if (kind === "dom") {
      assert.deepEqual(children.map((child) =>
        literal(property(property(child, "host"), "tag"))), ["span", "output"]);
      assert.ok(children.every((child) =>
        literal(property(property(property(child, "host"), "children")?.elements?.[0], "kind")) === "text"));
    } else {
      assert.deepEqual(children.map((child) =>
        literal(property(property(child, "host"), "tag"))), ["mesh", "group"]);
    }
    const emitted = await transformWithOxc(transformed.code, sourcePath, {
      lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" },
    });
    await writeFile(outputPath, emitted.code, { flag: "wx" });
    const app = await import(pathToFileURL(outputPath).href);
    app.oldA.resolve("old-a");
    await Promise.resolve();
    if (kind === "dom") {
      const hostAdapter = new MemoryVDOMHost();
      const container = hostAdapter.createContainer();
      const root = createNativeRoot(hostAdapter, container, { rootId: `resource-subtree-dom-${randomUUID()}`, scheduleCommit() {} });
      roots.push(root);
      root.mount(jsx(app.App, {}));
      await settleFlush(root);
      assert.equal(treeText(container), "old-aB waiting");
      const acceptedA = locate(container, (node) => node.props["data-a"] === "primary");
      const fallback = locate(container, (node) => node.props["data-b"] === "fallback");
      assert.ok(acceptedA && fallback);
      assert.equal(app.trace.fallbackMounts, 1);
      const staleSetter = app.trace.fallbackSetter;
      app.mode.dispatch(1); root.flush();
      assert.strictEqual(locate(container, (node) => node.props["data-a"] === "primary"), acceptedA);
      app.pendingB.resolve(7); await settleFlush(root);
      const ready = locate(container, (node) => node.props["data-b"] === "ready");
      assert.ok(ready && ready !== fallback && ready.children.length === 2);
      assert.equal(treeText(ready), "77");
      assert.equal(ready.children[1].props["data-count"], 8);
      assert.equal(app.trace.fallbackCleanups, 1);
      assert.equal(app.trace.fallbackSetter, null);
      assert.throws(() => staleSetter(2), /not alive/);
      assert.strictEqual(locate(container, (node) => node.props["data-a"] === "primary"), acceptedA);
      app.nextA.resolve("new-a"); await settleFlush(root);
      assert.strictEqual(locate(container, (node) => node.props["data-b"] === "ready"), ready);
      assert.equal(treeText(container), "new-a77");
      root.dispose();
      assert.equal(container.children.length, 0);
      assert.equal(root.diagnostics().ownerCount, 0);
      results.push({ kind, readyHosts: 3, fallbackMounts: app.trace.fallbackMounts,
        fallbackCleanups: app.trace.fallbackCleanups, ownerCountAfterDispose: root.diagnostics().ownerCount });
    } else {
      const scene = new THREE.Scene();
      const native = createThreeNativeRoot(scene, { namespace: THREE, rootOptions: {
        rootId: `resource-subtree-three-${randomUUID()}`, scheduleCommit() {},
      } });
      roots.push(native);
      native.root.mount(jsx(app.App, {}));
      await settleFlush(native.root);
      const parent = scene.children[0];
      assert.ok(parent instanceof THREE.Group);
      const acceptedA = parent.children.find((item) => item.name === "old-a");
      const fallback = parent.children.find((item) => item instanceof THREE.Mesh);
      assert.ok(acceptedA instanceof THREE.Group && fallback instanceof THREE.Mesh);
      assert.equal(app.trace.fallbackMounts, 1);
      const staleSetter = app.trace.fallbackSetter;
      const fallbackGeometry = fallback.geometry;
      const fallbackMaterial = fallback.material;
      let geometryDisposals = 0, materialDisposals = 0;
      const disposeGeometry = fallbackGeometry.dispose.bind(fallbackGeometry);
      const disposeMaterial = fallbackMaterial.dispose.bind(fallbackMaterial);
      fallbackGeometry.dispose = () => { geometryDisposals++; disposeGeometry(); };
      fallbackMaterial.dispose = () => { materialDisposals++; disposeMaterial(); };
      app.mode.dispatch(1); native.root.flush();
      assert.strictEqual(parent.children.find((item) => item.name === "old-a"), acceptedA);
      app.pendingB.resolve(7); await settleFlush(native.root);
      const ready = parent.children.find((item) => item.name === "ready");
      assert.ok(ready instanceof THREE.Group && ready !== fallback);
      assert.equal(ready.children.length, 2);
      assert.ok(ready.children[0] instanceof THREE.Mesh);
      assert.equal(ready.children[0].position.x, 8);
      assert.equal(ready.children[1].name, "static");
      assert.equal(app.trace.fallbackCleanups, 1);
      assert.equal(app.trace.fallbackSetter, null);
      assert.throws(() => staleSetter(2), /not alive/);
      assert.deepEqual([geometryDisposals, materialDisposals], [1, 1],
        "owned fallback Mesh resources were not disposed at B reveal");
      assert.strictEqual(parent.children.find((item) => item.name === "old-a"), acceptedA);
      app.nextA.resolve("new-a"); await settleFlush(native.root);
      assert.strictEqual(parent.children.find((item) => item.name === "ready"), ready);
      native.dispose();
      assert.equal(scene.children.length, 0);
      assert.equal(native.root.diagnostics().ownerCount, 0);
      assert.equal(native.host.diagnostics.liveHandles, 0);
      assert.deepEqual([geometryDisposals, materialDisposals], [1, 1],
        "retired fallback Mesh resources were not disposed exactly once");
      assert.equal(native.host.diagnostics.liveResources, 0);
      results.push({ kind, readyHosts: 3, fallbackMounts: app.trace.fallbackMounts,
        fallbackCleanups: app.trace.fallbackCleanups, fallbackGeometryDisposals: geometryDisposals,
        fallbackMaterialDisposals: materialDisposals,
        ownerCountAfterDispose: native.root.diagnostics().ownerCount,
        liveResourcesAfterDispose: native.host.diagnostics.liveResources });
    }
  }
} catch (error) { primaryError = error; }
const cleanupErrors = [];
for (const item of roots) {
  try { item.dispose(); }
  catch (error) { cleanupErrors.push(error); }
}
try { await plugin.closeBundle(); }
catch (error) { cleanupErrors.push(error); }
if (primaryError || cleanupErrors.length) {
  if (directoryCreated) {
    try {
      await writeFile(path.join(directory, "failure.json"), JSON.stringify({ status: "FAIL",
        primaryError: primaryError ? String(primaryError?.stack ?? primaryError) : null,
        cleanupErrors: cleanupErrors.map((error) => String(error?.stack ?? error)) }, null, 2) + "\n",
      { flag: "wx" });
    } catch (error) { cleanupErrors.push(error); }
  }
}
if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors],
  "compiled resource subtree fixture and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "compiled resource subtree cleanup failed");
await writeFile(path.join(directory, "result.json"), JSON.stringify({ status: "PASS", results }, null, 2) + "\n",
  { flag: "wx" });
console.log("PASS compiled resource subtree reveal: actual Rust/OXC DOM and Three subtrees reveal while an unrelated resource waits, retire fallback owners and owned Three resources at reveal, and dispose cleanly.");
console.log(`Evidence artifacts: ${directory}`);
