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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const compilerBinary = path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const directory = path.join(root, ".cache", `compiled-store-projections-${randomUUID()}`);
const fixture = path.join(root, "compiler/fixtures/native-store-projections.tsx");
const runtimeUrl = pathToFileURL(path.join(root, "src/native_runtime_api.ts")).href;
const source = (await readFile(fixture, "utf8"))
  .replace('"native_runtime_api.ts"', JSON.stringify(runtimeUrl));
const property = (node, name) => node?.properties?.find((entry) =>
  entry.type === "ObjectProperty" && !entry.computed &&
  (entry.key.name ?? entry.key.value) === name)?.value;
const literal = (node) => ["StringLiteral", "NumericLiteral"].includes(node?.type) ? node.value : null;
const value = (node) => {
  if (node?.type === "ArrayExpression") return node.elements.map(value);
  if (node?.type === "ObjectExpression") return Object.fromEntries(node.properties.map((entry) =>
    [entry.key.name ?? entry.key.value, value(entry.value)]));
  return literal(node);
};
const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [key, child] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
    if (Array.isArray(child)) child.forEach((item) => visit(item, callback));
    else if (child && typeof child === "object") visit(child, callback);
  }
};
const locate = (node, predicate) => predicate(node) ? node :
  (node.children ?? []).map((child) => locate(child, predicate)).find(Boolean);
const flushPending = async (nativeRoot) => {
  for (let index = 0; index < 4; index++) await new Promise((done) => setTimeout(done, 0));
  nativeRoot.flush();
};
const frozenPosition = (x, y) => Object.freeze({ position: Object.freeze({ x, y }) });
const frozenCamera = (x, y) => Object.freeze({ camera: Object.freeze({ x, y }) });
const plugin = nativeModuleCompilerPlugin({ root, compilerBinary });
const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
let dom, fork, three, queue, primaryError;
try {
  await mkdir(directory, { recursive: true });
  const sourcePath = path.join(directory, "store-projections.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  const compilerSha256 = createHash("sha256").update(await readFile(compilerBinary)).digest("hex");
  const transformed = await plugin.transform.call(context, source, sourcePath);
  assert.ok(transformed?.code, "Rust/OXC transform did not produce a module");
  await writeFile(path.join(directory, "store-projections.transformed.tsx"), transformed.code,
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
  assert.ok(aliases.get("useAt"));
  assert.ok(aliases.get("stabilizeHostTuple"));
  const plans = [];
  visit(ast, (node) => {
    if (node.type === "CallExpression" && node.callee.name === "__registerNativeSemanticPlan")
      plans.push(node);
  });
  assert.equal(plans.length, 1);
  const revision = literal(property(plans[0].arguments[0], "module_revision"));
  assert.match(revision, /^native-v1-[a-f0-9]+$/);
  const proofs = [];
  for (const name of ["Dom", "Three"]) {
    const definitions = [];
    visit(ast, (node) => {
      if (node.type === "CallExpression" && node.callee.name === aliases.get("defineComponent") &&
        literal(node.arguments[0])?.endsWith(`#component:${name}`)) definitions.push(node);
    });
    assert.equal(definitions.length, 1, `${name} compiled site missing`);
    const id = literal(definitions[0].arguments[0]);
    const program = property(definitions[0].arguments[2], "closedStoreHostProgram");
    assert.equal(literal(property(program, "schemaVersion")), 5);
    assert.equal(literal(property(program, "componentProgramId")), id);
    assert.equal(literal(property(program, "moduleRevision")), revision);
    const inputs = value(property(program, "inputs"));
    assert.deepEqual(inputs.map((entry) => [entry.storeUseSiteId, entry.storeProp]), [
      [`${id}#store:0`, "position"], [`${id}#store:1`, "camera"],
    ]);
    assert.deepEqual(inputs.map((entry) => entry.paths), [
      [["position", "x"], ["position", "y"]],
      [["camera", "x"], ["camera", "y"]],
    ]);
    const host = value(property(program, "host"));
    assert.equal(host.key, "scene");
    assert.equal(host.children.length, 2);
    if (name === "Dom") {
      const opacity = host.children[0].host.props[0][1].entries[0][1];
      assert.equal(opacity.kind, "binary");
      assert.equal(opacity.left.left.index, 2,
        "first expression reads camera, then maps to lexical input two");
      assert.equal(opacity.left.right.index, 0,
        "second expression read maps to lexical input one");
    }
    const functions = [];
    visit(ast, (node) => {
      if (node.type === "FunctionDeclaration" && node.id?.name === name) functions.push(node);
    });
    assert.equal(functions.length, 1);
    const reads = [], tuples = [];
    visit(functions[0].body, (node) => {
      if (node.type !== "CallExpression") return;
      if (node.callee.name === aliases.get("useAt")) reads.push(node);
      if (node.callee.name === aliases.get("stabilizeHostTuple")) tuples.push(node);
    });
    assert.deepEqual(reads.map((call) => literal(call.arguments[0])),
      inputs.map((entry) => entry.storeUseSiteId));
    assert.equal(tuples.length, name === "Three" ? 2 : 0);
    proofs.push({ name, id, moduleRevision: revision, paths: inputs.map((entry) => entry.paths),
      tupleCalls: tuples.length });
  }
  await writeFile(path.join(directory, "provenance.json"), JSON.stringify({
    compilerSha256, sourceSha256: createHash("sha256").update(source).digest("hex"),
    transformedSha256: createHash("sha256").update(transformed.code).digest("hex"), proofs,
  }, null, 2) + "\n", { flag: "wx" });
  const emitted = await transformWithOxc(transformed.code, sourcePath, {
    lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" },
  });
  const outputPath = path.join(directory, "store-projections.mjs");
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  const app = await import(pathToFileURL(outputPath).href);
  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  dom = createNativeRoot(host, container, { rootId: `projection-dom-${randomUUID()}`,
    scheduleCommit() {} });
  dom.mount(jsx(app.AppDom, {}));
  const forkHost = new MemoryVDOMHost();
  const forkContainer = forkHost.createContainer();
  fork = createNativeRoot(forkHost, forkContainer, { rootId: `projection-fork-${randomUUID()}`,
    scheduleCommit() {} });
  fork.mount(jsx(app.AppDom, {}));
  const scene = new THREE.Scene();
  three = createThreeNativeRoot(scene, { namespace: THREE,
    rootOptions: { rootId: `projection-three-${randomUUID()}`, scheduleCommit() {} } });
  three.root.mount(jsx(app.AppThree, {}));
  const outer = locate(container, (node) => node.tag === "div");
  const label = locate(outer, (node) => node.tag === "output");
  const text = label.children[0];
  const mesh = scene.children[0]?.children.find((node) => node instanceof THREE.Group)?.children[0];
  const outline = scene.children[0]?.children.find((node) => node instanceof THREE.Group)?.children[1];
  assert.ok(outer && label && mesh instanceof THREE.Mesh && outline instanceof THREE.Group);
  const geometry = mesh.geometry, material = mesh.material;
  const stale = dom.prepareStores([app.position]);
  assert.ok(stale);
  app.camera.dispatch(frozenCamera(5, 6));
  assert.equal(stale.validate(), false);
  stale.discard();
  app.position.dispatch(frozenPosition(7, 8));
  assert.equal(dom.flush(), true);
  assert.strictEqual(locate(container, (node) => node.tag === "div"), outer);
  assert.strictEqual(locate(outer, (node) => node.tag === "output"), label);
  assert.strictEqual(label.children[0], text);
  assert.equal(text.text, "8:6");
  assert.equal(label.props["data-sum"], 12);
  assert.deepEqual(label.props.style, { opacity: 1.2 });
  assert.equal(locate(forkContainer, (node) => node.tag === "output").children[0].text, "2:4");
  assert.equal(three.root.flush(), true);
  assert.deepEqual(mesh.position.toArray(), [7, 8, 5]);
  assert.deepEqual(outline.position.toArray(), [12, 6, 0]);
  queue = new NativeRootWorkQueue();
  app.position.dispatch(frozenPosition(9, 10));
  assert.equal(queue.enqueueStores({ id: "compiled-store-projection-group", roots: [
    { root: dom, stores: [app.position] }, { root: three.root, stores: [app.position] },
    { root: fork, stores: [app.position] },
  ] }).status, "committed");
  assert.equal(text.text, "10:6");
  assert.equal(locate(forkContainer, (node) => node.tag === "output").children[0].text, "10:6");
  assert.deepEqual(mesh.position.toArray(), [9, 10, 5]);
  assert.strictEqual(mesh.geometry, geometry);
  assert.strictEqual(mesh.material, material);
  assert.ok(locate(container, (node) => node.tag === "span"), "pending fallback lost");
  app.pending.resolve("healthy");
  await flushPending(dom);
  await flushPending(three.root);
  assert.strictEqual(locate(container, (node) => node.tag === "div"), outer);
  dom.dispose(); dom = null;
  assert.equal(container.children.length, 0);
  fork.dispose(); fork = null;
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
try { fork?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { three?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors],
  "Compiled Store projection fixture and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors,
  "Compiled Store projection cleanup failed");
console.log(`PASS compiled Store projections; provenance: ${directory}`);
