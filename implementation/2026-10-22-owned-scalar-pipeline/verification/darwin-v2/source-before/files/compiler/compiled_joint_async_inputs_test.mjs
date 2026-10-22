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
import { NativeRootWorkQueue } from "../src/native_root_work_queue.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const compilerBinary = path.join(projectRoot, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const fixture = path.join(projectRoot, "compiler/fixtures/native-joint-async-inputs.tsx");
const directory = path.join(projectRoot, ".cache", `compiled-joint-async-inputs-${randomUUID()}`);
const runtimeUrl = pathToFileURL(path.join(projectRoot, "src/native_runtime_api.ts")).href;
const source = (await readFile(fixture, "utf8"))
  .replace('"native_runtime_api.ts"', JSON.stringify(runtimeUrl));
const property = (node, name) => node?.type === "ObjectExpression" ?
  node.properties.find((entry) => entry.type === "ObjectProperty" && !entry.computed &&
    (entry.key.name ?? entry.key.value) === name)?.value : null;
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
const settleFlush = async (...roots) => {
  for (let index = 0; index < 5; index++) await new Promise((done) => setTimeout(done, 0));
  for (const root of roots) root.flush();
};
const record = (x, y) => storeRecord({ sample: storeRecord({ x, y }) });
const position = (x, y) => storeRecord({ vector: storeRecord({ x, y }) });
const plugin = nativeModuleCompilerPlugin({ root: projectRoot, compilerBinary });
const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
let dom, fork, three, queue, primaryError;
try {
  await mkdir(directory, { recursive: true });
  const sourcePath = path.join(directory, "joint-async-inputs.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  const compilerSha256 = createHash("sha256").update(await readFile(compilerBinary)).digest("hex");
  const transformed = await plugin.transform.call(context, source, sourcePath);
  assert.ok(transformed?.code, "Rust/OXC transform did not produce a module");
  await writeFile(path.join(directory, "joint-async-inputs.transformed.tsx"), transformed.code,
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
  assert.equal(aliases.get("stabilizeHostTuple"), "__nativeStabilizeHostTuple_");
  const plans = [];
  visit(ast, (node) => {
    if (node.type === "CallExpression" && node.callee.name === "__registerNativeSemanticPlan")
      plans.push(node);
  });
  assert.equal(plans.length, 1);
  const revision = literal(property(plans[0].arguments[0], "module_revision"));
  assert.match(revision, /^native-v1-[a-f0-9]+$/);
  const proofs = [];
  for (const name of ["Dom", "DomDestructured", "Three", "ThreeDestructured"]) {
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
    assert.ok(property(definitions[0].arguments[2], "closedResourceHostProgram") == null);
    const inputs = value(property(program, "inputs"));
    assert.deepEqual(inputs.map((entry) => [entry.storeUseSiteId, entry.storeProp]), [
      [`${id}#store:0`, "second"], [`${id}#store:1`, "position"],
      [`${id}#store:2`, "first"],
    ]);
    assert.deepEqual(inputs.map((entry) => entry.paths), name.startsWith("Dom") ? [
      [["sample", "y"], ["sample", "x"]],
      [["vector", "x"], ["vector", "y"]],
      [["sample", "x"], ["sample", "y"]],
    ] : [
      [["sample", "y"], ["sample", "x"]], [["vector", "x"]], [["sample", "x"]],
    ]);
    const host = value(property(program, "host"));
    assert.equal(host.key, "joint-root");
    assert.equal(host.children.length, 2);
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
    assert.equal(tuples.length, name.startsWith("Three") ? 2 : 0);
    proofs.push({ name, id, schemaVersion: 5, inputs, host, tupleCalls: tuples.length });
  }
  assert.deepEqual(proofs[0].host, proofs[1].host);
  assert.deepEqual(proofs[2].host, proofs[3].host);
  await writeFile(path.join(directory, "provenance.json"), JSON.stringify({
    compilerSha256, sourceSha256: createHash("sha256").update(source).digest("hex"),
    transformedSha256: createHash("sha256").update(transformed.code).digest("hex"),
    revision, proofs,
  }, null, 2) + "\n", { flag: "wx" });
  const emitted = await transformWithOxc(transformed.code, sourcePath, {
    lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" },
  });
  const outputPath = path.join(directory, "joint-async-inputs.mjs");
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  const app = await import(pathToFileURL(outputPath).href);
  const domHost = new MemoryVDOMHost();
  const domContainer = domHost.createContainer();
  dom = createNativeRoot(domHost, domContainer, { rootId: `joint-dom-${randomUUID()}`,
    scheduleCommit() {} });
  dom.mount(jsx(app.AppDom, {}));
  const forkHost = new MemoryVDOMHost();
  const forkContainer = forkHost.createContainer();
  fork = createNativeRoot(forkHost, forkContainer, { rootId: `joint-fork-${randomUUID()}`,
    scheduleCommit() {} });
  fork.mount(jsx(app.AppDom, {}));
  const scene = new THREE.Scene();
  three = createThreeNativeRoot(scene, { namespace: THREE,
    rootOptions: { rootId: `joint-three-${randomUUID()}`, scheduleCommit() {} } });
  three.root.mount(jsx(app.AppThree, {}));
  const domFallback = locate(domContainer, (node) => node.props?.["data-status"] === "waiting");
  const forkFallback = locate(forkContainer, (node) => node.props?.["data-status"] === "waiting");
  const threeParent = scene.children[0];
  const threeFallback = threeParent?.children.find((node) => node instanceof THREE.Mesh);
  assert.ok(domFallback && forkFallback && threeParent instanceof THREE.Group &&
    threeFallback instanceof THREE.Mesh);
  assert.equal(app.trace.fallbackMounts, 3);
  assert.equal(app.trace.fallbackCleanups, 0);
  assert.ok(locate(domContainer, (node) => node.props?.["data-health"] === "waiting"));
  const fallbackGeometry = threeFallback.geometry, fallbackMaterial = threeFallback.material;
  let geometryDisposals = 0, materialDisposals = 0;
  const originalGeometryDispose = fallbackGeometry.dispose.bind(fallbackGeometry);
  const originalMaterialDispose = fallbackMaterial.dispose.bind(fallbackMaterial);
  fallbackGeometry.dispose = () => { geometryDisposals++; originalGeometryDispose(); };
  fallbackMaterial.dispose = () => { materialDisposals++; originalMaterialDispose(); };

  app.firstPending.resolve(record(3, 4));
  await settleFlush(dom, fork, three.root);
  assert.strictEqual(locate(domContainer, (node) => node.props?.["data-status"] === "waiting"), domFallback);
  assert.strictEqual(locate(forkContainer, (node) => node.props?.["data-status"] === "waiting"), forkFallback);
  assert.strictEqual(threeParent.children.find((node) => node instanceof THREE.Mesh), threeFallback);
  assert.equal(app.trace.fallbackCleanups, 0, "first ready input revealed before second input");
  app.secondPending.resolve(record(5, 6));
  await settleFlush(dom, fork, three.root);
  const domJoint = locate(domContainer, (node) => node.tag === "div" &&
    node.children?.some((child) => child.tag === "output"));
  const forkJoint = locate(forkContainer, (node) => node.tag === "div" &&
    node.children?.some((child) => child.tag === "output"));
  const domLabel = domJoint?.children[0], forkLabel = forkJoint?.children[0];
  const threeJoint = threeParent.children.find((node) => node instanceof THREE.Group &&
    node.children.some((child) => child instanceof THREE.Mesh));
  const mesh = threeJoint?.children[0];
  assert.ok(domJoint && forkJoint && domLabel?.tag === "output" &&
    forkLabel?.tag === "output" && threeJoint instanceof THREE.Group &&
    mesh instanceof THREE.Mesh);
  assert.equal(domLabel.props["data-sum"], 10);
  assert.deepEqual(domLabel.props.style, { opacity: 0.5 });
  assert.equal(domLabel.children[0].text, "4:2:5");
  assert.equal(forkLabel.children[0].text, "4:2:5");
  assert.deepEqual(mesh.position.toArray(), [3, 1, 6]);
  assert.deepEqual(threeJoint.children[1].position.toArray(), [4, 5, 0]);
  assert.equal(app.trace.fallbackCleanups, 3);
  for (const setter of app.trace.staleSetters) assert.throws(() => setter(2), /not alive/);
  assert.deepEqual([geometryDisposals, materialDisposals], [1, 1]);
  assert.ok(locate(domContainer, (node) => node.props?.["data-health"] === "waiting"));
  const textNode = domLabel.children[0];
  const geometry = mesh.geometry, material = mesh.material;
  const stale = dom.prepareStores([app.position]);
  assert.ok(stale);
  app.position.dispatch(position(7, 8));
  assert.equal(stale.validate(), false);
  stale.discard();
  queue = new NativeRootWorkQueue();
  assert.equal(queue.enqueueStores({ id: "joint-async-store-group", roots: [
    { root: dom, stores: [app.position] }, { root: three.root, stores: [app.position] },
    { root: fork, stores: [app.position] },
  ] }).status, "committed");
  assert.strictEqual(locate(domContainer, (node) => node.tag === "div" &&
    node.children?.some((child) => child.tag === "output")), domJoint);
  assert.strictEqual(locate(forkContainer, (node) => node.tag === "div" &&
    node.children?.some((child) => child.tag === "output")), forkJoint);
  assert.strictEqual(threeParent.children.find((node) => node instanceof THREE.Group &&
    node.children.some((child) => child instanceof THREE.Mesh)), threeJoint);
  assert.strictEqual(domLabel.children[0], textNode);
  assert.equal(domLabel.props["data-sum"], 16);
  assert.equal(domLabel.children[0].text, "4:8:5");
  assert.equal(forkLabel.props["data-sum"], 16);
  assert.deepEqual(mesh.position.toArray(), [3, 7, 6]);
  assert.deepEqual(threeJoint.children[1].position.toArray(), [10, 5, 0]);
  assert.strictEqual(mesh.geometry, geometry);
  assert.strictEqual(mesh.material, material);
  assert.ok(locate(domContainer, (node) => node.props?.["data-health"] === "waiting"));
  app.healthPending.resolve("healthy");
  await settleFlush(dom, fork, three.root);
  assert.strictEqual(locate(domContainer, (node) => node.tag === "div" &&
    node.children?.some((child) => child.tag === "output")), domJoint);
  assert.equal(locate(domContainer, (node) => node.props?.["data-health"] === "healthy")?.tag, "span");
  assert.equal(threeParent.children.find((node) => node.name === "healthy") instanceof THREE.Group, true);
  dom.dispose(); dom = null;
  fork.dispose(); fork = null;
  three.root.dispose();
  assert.equal(domContainer.children.length, 0);
  assert.equal(forkContainer.children.length, 0);
  assert.equal(scene.children.length, 0);
  assert.equal(three.host.diagnostics.liveHandles, 0);
  three.host.dispose();
  assert.equal(three.host.diagnostics.liveResources, 0);
  assert.equal(three.host.diagnostics.createdResources, three.host.diagnostics.disposedResources);
  assert.deepEqual([geometryDisposals, materialDisposals], [1, 1]);
  three = null;
  await writeFile(path.join(directory, "result.json"), JSON.stringify({ status: "PASS",
    fallbackMounts: app.trace.fallbackMounts, fallbackCleanups: app.trace.fallbackCleanups,
    groupedDomSum: 16, geometryDisposals, materialDisposals,
  }, null, 2) + "\n", { flag: "wx" });
} catch (error) { primaryError = error; }
const cleanupErrors = [];
try { queue?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { dom?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { fork?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { three?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
if (primaryError || cleanupErrors.length) {
  try { await writeFile(path.join(directory, "failure.json"), JSON.stringify({ status: "FAIL",
    primaryError: primaryError ? String(primaryError?.stack ?? primaryError) : null,
    cleanupErrors: cleanupErrors.map((error) => String(error?.stack ?? error)),
  }, null, 2) + "\n", { flag: "wx" }); }
  catch (error) { cleanupErrors.push(error); }
}
if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors],
  "Compiled joint async fixture and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors,
  "Compiled joint async fixture cleanup failed");
console.log(`PASS compiled joint async inputs; provenance: ${directory}`);
