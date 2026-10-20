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
const directory = path.join(projectRoot, ".cache", `compiled-store-subtree-${randomUUID()}`);
const source = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { Suspense, use, createStore, jsx } from ${JSON.stringify(runtimeUrl)};
export function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
export const pending = deferred();
export const position = createStore(1, (_old, next) => next);
export const camera = createStore(2, (_old, next) => next);
export function PendingDom() { const value = use(pending.promise); return <span key="pending-dom">{value}</span>; }
export function PendingThree() { const value = use(pending.promise); return <group key="pending-three" name={value} />; }
export function Dom(props) {
  const x = use(props.position); const y = use(props.camera);
  return <div key="scene"><output key="label" style={{opacity:(x+y)/10}}>{x+y}</output><span key="tail">{x}</span></div>;
}
export function Three(props) {
  const x = use(props.position); const y = use(props.camera);
  return <group key="scene"><mesh key="mesh" position={[x,0,0]} /><mesh key="outline" position={[x,y,0]} /></group>;
}
export function AppDom() { return <section>
  <Dom key="dom-owner" position={position} camera={camera} />
  <Suspense fallback={<span key="waiting-dom">waiting</span>}><PendingDom key="pending-owner" /></Suspense>
</section>; }
export function AppThree() { return <group key="scene-root">
  <Three key="three-owner" position={position} camera={camera} />
  <mesh key="owned-static"><boxGeometry /><meshStandardMaterial /></mesh>
  <Suspense fallback={<group key="waiting-three" name="waiting" />}><PendingThree key="pending-owner" /></Suspense>
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
let dom, domFork, three, queue, primaryError;
try {
  await mkdir(directory, { recursive: true });
  const sourcePath = path.join(directory, "store-subtree.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  const compilerSha256 = createHash("sha256").update(await readFile(compilerBinary)).digest("hex");
  const transformed = await plugin.transform.call(context, source, sourcePath);
  assert.ok(transformed?.code, "Rust/OXC transform did not produce a module");
  await writeFile(path.join(directory, "store-subtree.transformed.tsx"), transformed.code,
    { flag: "wx" });
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const aliases = new Map();
  for (const statement of ast.program.body) {
    if (statement.type !== "ImportDeclaration") continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type === "ImportSpecifier") aliases.set(
        specifier.imported.name ?? specifier.imported.value, specifier.local.name);
    }
  }
  assert.ok(aliases.get("stabilizeHostTuple"), "tuple helper import missing");
  const plans = [], invalidations = [];
  visit(ast, (node) => {
    if (node.type !== "CallExpression" || node.callee.type !== "Identifier") return;
    if (node.callee.name === "__registerNativeSemanticPlan") plans.push(node);
    if (node.callee.name === "__invalidateNativeSemanticPlan") invalidations.push(node);
  });
  assert.equal(plans.length, 1);
  assert.equal(invalidations.length, 1);
  const semantic = plans[0].arguments[0];
  const sourceFile = literal(property(semantic, "source_file"));
  const moduleRevision = literal(property(semantic, "module_revision"));
  assert.equal(sourceFile, path.relative(projectRoot, sourcePath).split(path.sep).join("/"));
  assert.match(moduleRevision, /^native-v1-[a-f0-9]+$/);
  assert.equal(literal(invalidations[0].arguments[0]), sourceFile);
  assert.equal(literal(invalidations[0].arguments[1]), moduleRevision);
  const proofs = [];
  for (const name of ["Dom", "Three"]) {
    const sites = [];
    visit(ast, (node) => {
      if (node.type === "CallExpression" && node.callee.name === aliases.get("defineComponent") &&
        literal(node.arguments[0])?.endsWith(`#component:${name}`)) sites.push(node);
    });
    assert.equal(sites.length, 1, `${name} compiled site missing`);
    const id = literal(sites[0].arguments[0]);
    const program = property(sites[0].arguments[2], "closedStoreHostProgram");
    assert.equal(literal(property(program, "schemaVersion")), 4);
    assert.equal(literal(property(program, "componentProgramId")), id);
    assert.equal(literal(property(program, "moduleRevision")), moduleRevision);
    const inputs = property(program, "inputs")?.elements ?? [];
    assert.deepEqual(inputs.map((entry) => literal(property(entry, "storeProp"))),
      ["position", "camera"]);
    assert.deepEqual(inputs.map((entry) => literal(property(entry, "storeUseSiteId"))),
      [`${id}#store:0`, `${id}#store:1`]);
    const host = property(program, "host");
    assert.equal(literal(property(host, "key")), "scene");
    assert.equal(property(host, "children")?.elements?.length, 2);
    const functions = [];
    visit(ast, (node) => {
      if (node.type === "FunctionDeclaration" && node.id?.name === name) functions.push(node);
    });
    assert.equal(functions.length, 1);
    const reads = [], tuples = [];
    visit(functions[0].body, (node) => {
      if (node.type !== "CallExpression" || node.callee.type !== "Identifier") return;
      if (node.callee.name === aliases.get("useAt")) reads.push(node);
      if (node.callee.name === aliases.get("stabilizeHostTuple")) tuples.push(node);
    });
    assert.deepEqual(reads.map((call) => literal(call.arguments[0])),
      inputs.map((entry) => literal(property(entry, "storeUseSiteId"))));
    assert.equal(tuples.length, name === "Three" ? 2 : 0);
    const positions = [];
    visit(functions[0].body, (node) => {
      if (node.type !== "JSXOpeningElement") return;
      for (const attribute of node.attributes) {
        if (attribute.type === "JSXAttribute" && attribute.name.name === "position") {
          positions.push(attribute.value?.expression);
        }
      }
    });
    assert.equal(positions.length, name === "Three" ? 2 : 0);
    for (const position of positions) {
      assert.ok(tuples.includes(position), "authored nested tuple was not stabilized in place");
      assert.equal(position.arguments[0]?.type, "ArrayExpression");
      assert.equal(position.arguments[0]?.elements?.length, 3);
    }
    proofs.push({ name, id, moduleRevision, schemaVersion: 4, tupleCalls: tuples.length });
  }
  await writeFile(path.join(directory, "provenance.json"), JSON.stringify({
    compilerSha256, sourceSha256: createHash("sha256").update(source).digest("hex"),
    transformedSha256: createHash("sha256").update(transformed.code).digest("hex"), proofs,
  }, null, 2) + "\n", { flag: "wx" });
  const emitted = await transformWithOxc(transformed.code, sourcePath, {
    lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" },
  });
  const outputPath = path.join(directory, "store-subtree.mjs");
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  const app = await import(pathToFileURL(outputPath).href);
  const domHost = new MemoryVDOMHost();
  const container = domHost.createContainer();
  dom = createNativeRoot(domHost, container, { rootId: `subtree-dom-${randomUUID()}`,
    scheduleCommit() {} });
  dom.mount(jsx(app.AppDom, {}));
  const forkHost = new MemoryVDOMHost();
  const forkContainer = forkHost.createContainer();
  domFork = createNativeRoot(forkHost, forkContainer, { rootId: `subtree-fork-${randomUUID()}`,
    scheduleCommit() {} });
  domFork.mount(jsx(app.AppDom, {}));
  const scene = new THREE.Scene();
  three = createThreeNativeRoot(scene, { namespace: THREE,
    rootOptions: { rootId: `subtree-three-${randomUUID()}`, scheduleCommit() {} } });
  three.root.mount(jsx(app.AppThree, {}));
  const outer = locate(container, (node) => node.tag === "div");
  const label = locate(outer, (node) => node.tag === "output");
  const textNode = label.children[0];
  const mesh = scene.children[0]?.children.find(
    (node) => node instanceof THREE.Group)?.children[0];
  const outline = scene.children[0]?.children.find(
    (node) => node instanceof THREE.Group)?.children[1];
  assert.ok(outer && label && mesh instanceof THREE.Mesh && outline instanceof THREE.Mesh);
  const geometry = mesh.geometry, material = mesh.material;
  const stale = dom.prepareStores([app.position]);
  assert.ok(stale);
  app.camera.dispatch(4);
  assert.equal(stale.validate(), false);
  stale.discard();
  app.position.dispatch(5);
  assert.equal(dom.flush(), true);
  assert.strictEqual(locate(container, (node) => node.tag === "div"), outer);
  assert.strictEqual(locate(outer, (node) => node.tag === "output"), label);
  assert.strictEqual(label.children[0], textNode);
  assert.equal(textNode.text, "9");
  assert.deepEqual(label.props.style, { opacity: 0.9 });
  assert.equal(locate(forkContainer, (node) => node.tag === "output").children[0].text, "3",
    "unselected fork consumed another root's Store history");
  assert.equal(three.root.flush(), true);
  assert.deepEqual(mesh.position.toArray(), [5, 0, 0]);
  assert.deepEqual(outline.position.toArray(), [5, 4, 0]);
  queue = new NativeRootWorkQueue();
  app.position.dispatch(7);
  assert.equal(queue.enqueueStores({ id: "compiled-store-subtree-group", roots: [
    { root: dom, stores: [app.position] }, { root: three.root, stores: [app.position] },
    { root: domFork, stores: [app.position] },
  ] }).status, "committed");
  assert.equal(textNode.text, "11");
  assert.equal(locate(forkContainer, (node) => node.tag === "output").children[0].text, "11");
  assert.deepEqual(mesh.position.toArray(), [7, 0, 0]);
  assert.deepEqual(outline.position.toArray(), [7, 4, 0]);
  assert.strictEqual(mesh.geometry, geometry);
  assert.strictEqual(mesh.material, material);
  assert.ok(locate(container, (node) => node.tag === "span"), "pending fallback lost");
  app.pending.resolve("healthy");
  await flushPending(dom);
  await flushPending(three.root);
  assert.strictEqual(locate(container, (node) => node.tag === "div"), outer);
  dom.dispose(); dom = null;
  assert.equal(container.children.length, 0);
  domFork.dispose(); domFork = null;
  assert.equal(forkContainer.children.length, 0);
  three.root.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(three.host.diagnostics.liveHandles, 0);
  three.host.dispose();
  assert.equal(three.host.diagnostics.liveResources, 0);
  assert.equal(three.host.diagnostics.createdResources, three.host.diagnostics.disposedResources);
  three = null;
} catch (error) { primaryError = error; }
const cleanupErrors = [];
try { queue?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { dom?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { domFork?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { three?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors],
  "Compiled Store subtree fixture and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors,
  "Compiled Store subtree cleanup failed");
console.log(`PASS compiled Store host subtrees; provenance: ${directory}`);
