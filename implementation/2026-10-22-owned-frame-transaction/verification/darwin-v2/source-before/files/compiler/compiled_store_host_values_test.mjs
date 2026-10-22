import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { transformWithOxc } from "vite";
import * as THREE from "three";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { NativeRootWorkQueue } from "../src/native_root_work_queue.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeUrl = pathToFileURL(path.join(projectRoot, "src/native_runtime_api.ts")).href;
const compilerBinary = path.join(projectRoot,
  "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const directory = path.join(projectRoot, ".cache", `compiled-store-host-values-${randomUUID()}`);
const source = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { Suspense, use, createStore, jsx } from ${JSON.stringify(runtimeUrl)};
export function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
export const pending = deferred();
export const position = createStore(1, (_old, next) => next);
export const camera = createStore(2, (_old, next) => next);
export function PendingDom() { const value = use(pending.promise); return <span key="pending-host">{value}</span>; }
export function PendingThree() { const value = use(pending.promise); return <group key="pending-host" name={value} />; }
export function Dom(props) {
  const x = use(props.position); const y = use(props.camera);
  return <output key="dom-host" style={{ color: "red", opacity: (x + y) / 10 }} />;
}
export function Three(props) {
  const x = use(props.position); const y = use(props.camera);
  return <mesh key="three-host" position={[x + y, 2, 3]} />;
}
export function AppDom() { return <section>
  <Dom key="dom-owner" position={position} camera={camera} />
  <Suspense fallback={<span key="pending-host">waiting</span>}><PendingDom key="pending-owner" /></Suspense>
</section>; }
export function AppThree() { return <group key="scene-root">
  <Three key="three-owner" position={position} camera={camera} />
  <mesh key="owned-static"><boxGeometry /><meshStandardMaterial /></mesh>
  <Suspense fallback={<group key="pending-host" name="waiting" />}><PendingThree key="pending-owner" /></Suspense>
</group>; }
`;
const property = (node, name) => node?.properties?.find((entry) =>
  entry.type === "ObjectProperty" && !entry.computed &&
    (entry.key.name ?? entry.key.value) === name)?.value;
const literal = (node) => node?.type === "StringLiteral" || node?.type === "NumericLiteral"
  ? node.value : null;
const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
    if (Array.isArray(value)) value.forEach((item) => visit(item, callback));
    else if (value && typeof value === "object") visit(value, callback);
  }
};
const locate = (node, predicate) => predicate(node) ? node :
  node.children.map((child) => locate(child, predicate)).find(Boolean);
const flushPending = async (root) => {
  for (let index = 0; index < 4; index++) await new Promise((done) => setTimeout(done, 0));
  root.flush();
};
const plugin = nativeModuleCompilerPlugin({ root: projectRoot, compilerBinary });
const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
const roots = [];
let three;
let queue;
let primaryError;
try {
  await mkdir(directory, { recursive: true });
  const sourcePath = path.join(directory, "store-values.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  const compilerSha256 = createHash("sha256").update(await readFile(compilerBinary)).digest("hex");
  const transformed = await plugin.transform.call(context, source, sourcePath);
  assert.ok(transformed?.code, "Rust/OXC transform did not produce a module");
  await writeFile(path.join(directory, "store-values.transformed.tsx"), transformed.code,
    { flag: "wx" });
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const componentAliases = new Set();
  const storeReadAliases = new Set();
  const tupleAliases = new Set();
  for (const statement of ast.program.body) {
    if (statement.type !== "ImportDeclaration") continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type !== "ImportSpecifier") continue;
      const imported = specifier.imported.name ?? specifier.imported.value;
      if (imported === "defineComponent") componentAliases.add(specifier.local.name);
      if (imported === "useAt") storeReadAliases.add(specifier.local.name);
      if (imported === "stabilizeHostTuple") tupleAliases.add(specifier.local.name);
    }
  }
  assert.equal(tupleAliases.size, 1, "compiled tuple helper import is missing or ambiguous");
  assert.equal(storeReadAliases.size, 1, "compiled Store-read import is missing or ambiguous");
  const planCalls = [], invalidations = [];
  visit(ast, (node) => {
    if (node.type !== "CallExpression" || node.callee.type !== "Identifier") return;
    if (node.callee.name === "__registerNativeSemanticPlan") planCalls.push(node);
    if (node.callee.name === "__invalidateNativeSemanticPlan") invalidations.push(node);
  });
  assert.equal(planCalls.length, 1, "expected one semantic plan registration");
  assert.equal(invalidations.length, 1, "expected one semantic plan invalidation");
  const semantic = planCalls[0].arguments[0];
  const sourceFile = literal(property(semantic, "source_file"));
  const moduleRevision = literal(property(semantic, "module_revision"));
  assert.equal(sourceFile, path.relative(projectRoot, sourcePath).split(path.sep).join("/"));
  assert.match(moduleRevision, /^native-v1-[a-f0-9]+$/);
  assert.equal(literal(invalidations[0].arguments[0]), sourceFile);
  assert.equal(literal(invalidations[0].arguments[1]), moduleRevision);
  const proofs = [];
  for (const [name, propKind] of [["Dom", "style"], ["Three", "tuple"]]) {
    const matches = [];
    visit(ast, (node) => {
      if (node.type === "CallExpression" && componentAliases.has(node.callee.name) &&
        literal(node.arguments[0])?.endsWith(`#component:${name}`)) matches.push(node);
    });
    assert.equal(matches.length, 1, `${name} has no compiled registration`);
    const id = literal(matches[0].arguments[0]);
    assert.equal(matches[0].arguments[1]?.name, name);
    assert.equal(id, `${sourceFile}#component:${name}`);
    const program = property(matches[0].arguments[2], "closedStoreHostProgram");
    assert.equal(literal(property(program, "schemaVersion")), 3);
    assert.equal(literal(property(program, "componentProgramId")), id);
    const revision = literal(property(program, "moduleRevision"));
    assert.equal(revision, moduleRevision);
    const inputs = property(program, "inputs")?.elements ?? [];
    assert.deepEqual(inputs.map((entry) => literal(property(entry, "storeProp"))),
      ["position", "camera"]);
    assert.deepEqual(inputs.map((entry) => literal(property(entry, "storeUseSiteId"))),
      [`${id}#store:0`, `${id}#store:1`]);
    const functions = [];
    visit(ast, (node) => {
      if (node.type === "FunctionDeclaration" && node.id?.name === name) functions.push(node);
    });
    assert.equal(functions.length, 1, `${name} authored function was not preserved`);
    const reads = [], tupleCalls = [];
    visit(functions[0].body, (node) => {
      if (node.type !== "CallExpression" || node.callee.type !== "Identifier") return;
      if (storeReadAliases.has(node.callee.name)) reads.push(node);
      if (tupleAliases.has(node.callee.name)) tupleCalls.push(node);
    });
    assert.deepEqual(reads.map((call) => literal(call.arguments[0])),
      inputs.map((entry) => literal(property(entry, "storeUseSiteId"))));
    assert.deepEqual(reads.map((call) => [call.arguments[1]?.object?.name,
      call.arguments[1]?.property?.name]),
    [["props", "position"], ["props", "camera"]]);
    const positionExpressions = [];
    visit(functions[0].body, (node) => {
      if (node.type !== "JSXOpeningElement") return;
      for (const attribute of node.attributes) {
        if (attribute.type === "JSXAttribute" && attribute.name.name === "position") {
          positionExpressions.push(attribute.value?.expression);
        }
      }
    });
    if (name === "Three") {
      assert.equal(tupleCalls.length, 1, "Three tuple was not wrapped exactly once");
      assert.equal(positionExpressions.length, 1);
      assert.strictEqual(positionExpressions[0], tupleCalls[0],
        "tuple helper did not wrap the authored position expression");
      const tuple = tupleCalls[0].arguments[0];
      assert.equal(tuple?.type, "ArrayExpression");
      assert.equal(tuple.elements.length, 3);
      assert.equal(tuple.elements[0]?.type, "BinaryExpression");
      assert.equal(literal(tuple.elements[1]), 2);
      assert.equal(literal(tuple.elements[2]), 3);
    } else {
      assert.equal(tupleCalls.length, 0, "DOM style used the tuple helper");
      assert.equal(positionExpressions.length, 0);
    }
    const host = property(program, "host");
    const value = property(host, "props")?.elements?.[0]?.elements?.[1];
    assert.equal(literal(property(value, "kind")), propKind);
    proofs.push({ name, id, revision, propKind });
  }
  assert.equal(proofs[0].revision, proofs[1].revision);
  await writeFile(path.join(directory, "provenance.json"), JSON.stringify({
    compilerSha256, sourceSha256: createHash("sha256").update(source).digest("hex"),
    transformedSha256: createHash("sha256").update(transformed.code).digest("hex"), proofs,
  }, null, 2) + "\n", { flag: "wx" });
  const emitted = await transformWithOxc(transformed.code, sourcePath, {
    lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" },
  });
  const outputPath = path.join(directory, "store-values.mjs");
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  const app = await import(pathToFileURL(outputPath).href);
  const domHost = new MemoryVDOMHost();
  const container = domHost.createContainer();
  const dom = createNativeRoot(domHost, container, { rootId: `store-values-dom-${randomUUID()}`,
    scheduleCommit() {} });
  roots.push(dom);
  dom.mount(jsx(app.AppDom, {}));
  const scene = new THREE.Scene();
  three = createThreeNativeRoot(scene, { namespace: THREE,
    rootOptions: { rootId: `store-values-three-${randomUUID()}`, scheduleCommit() {} } });
  three.root.mount(jsx(app.AppThree, {}));
  const output = locate(container, (node) => node.tag === "output");
  const mesh = scene.children[0]?.children.find((node) => node instanceof THREE.Mesh &&
    node.position.x === 3);
  assert.ok(output && mesh instanceof THREE.Mesh);
  assert.deepEqual(output.props.style, { color: "red", opacity: 0.3 });
  assert.deepEqual(mesh.position.toArray(), [3, 2, 3]);
  const geometry = mesh.geometry, material = mesh.material;
  const stale = dom.prepareStores([app.position]);
  assert.ok(stale);
  app.camera.dispatch(4);
  assert.equal(stale.validate(), false);
  stale.discard();
  app.position.dispatch(5);
  assert.equal(dom.flush(), true);
  assert.strictEqual(locate(container, (node) => node.tag === "output"), output);
  assert.deepEqual(output.props.style, { color: "red", opacity: 0.9 });
  assert.deepEqual(mesh.position.toArray(), [3, 2, 3], "DOM consumed Three history");
  assert.equal(three.root.flush(), true);
  assert.deepEqual(mesh.position.toArray(), [9, 2, 3]);
  assert.strictEqual(mesh.geometry, geometry);
  assert.strictEqual(mesh.material, material);
  assert.ok(locate(container, (node) => node.tag === "span"), "pending fallback was lost");
  queue = new NativeRootWorkQueue();
  app.position.dispatch(7);
  const grouped = queue.enqueueStores({ id: "compiled-structured-store-group", roots: [
    { root: dom, stores: [app.position] },
    { root: three.root, stores: [app.position] },
  ] });
  assert.equal(grouped.status, "committed");
  assert.deepEqual(output.props.style, { color: "red", opacity: 1.1 });
  assert.deepEqual(mesh.position.toArray(), [11, 2, 3]);
  queue.dispose();
  app.pending.resolve("healthy");
  await flushPending(dom);
  await flushPending(three.root);
  assert.strictEqual(locate(container, (node) => node.tag === "output"), output);
  assert.deepEqual(mesh.position.toArray(), [11, 2, 3]);
  dom.dispose();
  assert.equal(container.children.length, 0);
  three.root.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(three.host.diagnostics.liveHandles, 0);
  three.host.dispose();
  assert.equal(three.host.diagnostics.liveResources, 0);
  assert.equal(three.host.diagnostics.createdResources,
    three.host.diagnostics.disposedResources);
} catch (error) { primaryError = error; }
const cleanupErrors = [];
try { queue?.dispose(); } catch (error) { cleanupErrors.push(error); }
for (const root of roots) try { root.dispose(); } catch (error) { cleanupErrors.push(error); }
try { three?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors],
  "Compiled Store values fixture and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "Compiled Store values cleanup failed");
console.log(`PASS compiled Store host values; provenance: ${directory}`);
