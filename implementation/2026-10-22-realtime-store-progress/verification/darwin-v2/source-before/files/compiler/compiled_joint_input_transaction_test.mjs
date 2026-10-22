import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { transformWithOxc } from "vite";
import * as THREE from "three";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { compiledNumericDescriptors } from "./compiled_numeric_descriptor_test_helpers.mjs";
import { createNativeRoot, NativeRootWorkQueue, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";

const projectRoot = path.resolve(".");
const runtimeUrl = pathToFileURL(path.join(projectRoot, "src/native_runtime_api.ts")).href;
const authored = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { Suspense, use, useState, useEffect, createStore, createKeyedCollection,
  renderCollectionAt, jsx } from ${JSON.stringify(runtimeUrl)};
export function deferred() {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
}
export const firstA = deferred();
export const nextA = deferred();
export const mode = createStore(0, (_state, action) => action);
export const position = createStore(1, (_state, action) => action);
export const camera = createStore(10, (_state, action) => action);
export const domRows = createKeyedCollection([
  { id: "a" }, { id: "b" }, { id: "c" },
], row => row.id);
export const threeRows = createKeyedCollection([
  { id: "a" }, { id: "b" }, { id: "c" },
], row => row.id);
export const trace = {
  controls: { dom: null, three: null },
  activations: { dom: 0, three: 0 },
  cleanups: { dom: 0, three: 0 },
  rowRenders: { dom: Object.create(null), three: Object.create(null) },
  rowMounts: { dom: Object.create(null), three: Object.create(null) },
  rowCleanups: { dom: Object.create(null), three: Object.create(null) },
};
export function ADom() {
  const resource = use(mode) === 0 ? firstA.promise : nextA.promise;
  const value = use(resource);
  return <div key="a-host">{value}</div>;
}
export function AThree() {
  const resource = use(mode) === 0 ? firstA.promise : nextA.promise;
  const value = use(resource);
  return <group key="a-group" name={value} />;
}
export function JointDom(props) {
  const x = use(props.position);
  const y = use(props.camera);
  return <output key="joint-dom" data-joint={x + y} />;
}
export function JointThree(props) {
  const x = use(props.position);
  const y = use(props.camera);
  return <mesh key="joint-three" position-x={x + y} />;
}
export function WorldDom() {
  const [value, setValue] = useState(0);
  useEffect(() => {
    trace.controls.dom = setValue;
    trace.activations.dom++;
    return () => {
      trace.cleanups.dom++;
      if (trace.controls.dom === setValue) trace.controls.dom = null;
    };
  });
  return <output key="world-dom" data-world={value} />;
}
export function WorldThree() {
  const [value, setValue] = useState(0);
  useEffect(() => {
    trace.controls.three = setValue;
    trace.activations.three++;
    return () => {
      trace.cleanups.three++;
      if (trace.controls.three === setValue) trace.controls.three = null;
    };
  });
  return <mesh key="world-three" position-x={value} />;
}
export function RowDom({ row }) {
  trace.rowRenders.dom[row.id] = (trace.rowRenders.dom[row.id] || 0) + 1;
  useEffect(() => {
    trace.rowMounts.dom[row.id] = (trace.rowMounts.dom[row.id] || 0) + 1;
    return () => { trace.rowCleanups.dom[row.id] = (trace.rowCleanups.dom[row.id] || 0) + 1; };
  });
  return <li key={row.id} data-row={row.id}>{row.id}</li>;
}
export function RowThree({ row }) {
  trace.rowRenders.three[row.id] = (trace.rowRenders.three[row.id] || 0) + 1;
  useEffect(() => {
    trace.rowMounts.three[row.id] = (trace.rowMounts.three[row.id] || 0) + 1;
    return () => { trace.rowCleanups.three[row.id] = (trace.rowCleanups.three[row.id] || 0) + 1; };
  });
  return <group key={row.id} name={row.id} />;
}
export function ListDom() {
  return <ul key="dom-list">{renderCollectionAt("dom-rows", domRows,
    row => <RowDom key={row.id} row={row} />)}</ul>;
}
export function ListThree() {
  return <group key="three-list">{renderCollectionAt("three-rows", threeRows,
    row => <RowThree key={row.id} row={row} />)}</group>;
}
export function AppDom() {
  return <section>
    <Suspense fallback={<div key="a-host">a-loading</div>}>
      <ADom key="a-child" />
    </Suspense>
    <JointDom key="joint-child" position={position} camera={camera} />
    <WorldDom key="world-child" />
    <ListDom key="list-child" />
  </section>;
}
export function AppThree() {
  return <group key="app-group">
    <Suspense fallback={<group key="a-group" name="a-loading" />}>
      <AThree key="a-child" />
    </Suspense>
    <JointThree key="joint-child" position={position} camera={camera} />
    <WorldThree key="world-child" />
    <ListThree key="list-child" />
  </group>;
}
`;

const property = (node, name) => node?.properties?.find((entry) =>
  entry.type === "ObjectProperty" && !entry.computed &&
  (entry.key.name ?? entry.key.value) === name
)?.value;
const stringValue = (node) => node?.type === "StringLiteral" ? node.value : null;
const registrationsFor = (ast, suffix) => {
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
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "CallExpression" && node.callee.type === "Identifier" &&
      aliases.has(node.callee.name) &&
      stringValue(node.arguments[0])?.endsWith(suffix)) found.push(node);
    for (const [key, value] of Object.entries(node)) {
      if (key === "loc" || key === "start" || key === "end") continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  };
  visit(ast);
  return found;
};
const locate = (node, predicate) =>
  predicate(node) ? node : node.children.map((child) =>
    locate(child, predicate)).find(Boolean);
const text = (node) => (node.text ?? "") + node.children.map(text).join("");
const settleFlush = async (root) => {
  for (let index = 0; index < 5; index++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  root.flush();
};
const rowOrder = (list) => list.children.map((node) => node.props["data-row"]);

const plugin = nativeModuleCompilerPlugin({
  root: projectRoot,
  compilerBinary: path.join(projectRoot,
    "compiler/oxc-spike/target/debug/ui-graph-compiler-spike"),
});
const context = {
  addWatchFile() {},
  error(message) { throw new Error(String(message)); },
};
let dom;
let three;
let queue;
let primaryError;
let artifactDirectory;
let unsubscribeDom;
let unsubscribeThree;
let app;
try {
  const cacheDirectory = path.join(projectRoot, ".cache");
  await mkdir(cacheDirectory, { recursive: true });
  artifactDirectory = path.join(cacheDirectory,
    `compiled-joint-input-transaction-${randomUUID()}`);
  await mkdir(artifactDirectory, { recursive: false });
  const sourcePath = path.join(artifactDirectory, "joint-input.tsx");
  const transformedPath = path.join(artifactDirectory, "joint-input.transformed.tsx");
  const outputPath = path.join(artifactDirectory, "joint-input.mjs");
  await writeFile(sourcePath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, sourcePath);
  assert.ok(transformed?.code, "authored joint input TSX did not compile through Rust/OXC");
  await writeFile(transformedPath, transformed.code, { flag: "wx" });
  const ast = parse(transformed.code, {
    sourceType: "module", plugins: ["typescript", "jsx"],
  });
  const compilerProof = [];
  for (const name of ["JointDom", "JointThree"]) {
    const registrations = registrationsFor(ast, `#component:${name}`);
    assert.equal(registrations.length, 1, `${name} lacks one actual registration`);
    assert.equal(registrations[0].arguments[1]?.name, name);
    const id = stringValue(registrations[0].arguments[0]);
    const program = property(registrations[0].arguments[2], "closedStoreHostProgram");
    assert.equal(program?.type, "ObjectExpression", `${name} lacks closed Store IR`);
    assert.equal(property(program, "schemaVersion")?.value, 2);
    assert.equal(stringValue(property(program, "componentProgramId")), id);
    const revision = stringValue(property(program, "moduleRevision"));
    assert.ok(revision);
    const inputs = property(program, "inputs");
    assert.deepEqual(inputs?.elements.map((entry) =>
      stringValue(property(entry, "storeProp"))), ["position", "camera"]);
    assert.deepEqual(inputs?.elements.map((entry) =>
      stringValue(property(entry, "storeUseSiteId"))),
    [`${id}#store:0`, `${id}#store:1`]);
    const host = property(program, "host");
    assert.equal(stringValue(property(host, "tag")), name === "JointDom" ? "output" : "mesh");
    assert.equal(property(host, "child")?.type, "NullLiteral");
    const expression = property(host, "props")?.elements[0]?.elements[1];
    assert.equal(stringValue(property(expression, "kind")), "binary");
    assert.equal(property(property(expression, "left"), "index")?.value, 0);
    assert.equal(property(property(expression, "right"), "index")?.value, 1);
    compilerProof.push({ name, id, revision, inputProps: ["position", "camera"] });
  }
  for (const name of ["WorldDom", "WorldThree"]) {
    const registrations = registrationsFor(ast, `#component:${name}`);
    assert.equal(registrations.length, 1, `${name} lacks one actual registration`);
    const metadata = registrations[0].arguments[2];
    const layout = property(metadata, "stateLayout");
    assert.equal(layout?.type, "ObjectExpression", `${name} lacks World state layout`);
    assert.equal(property(layout, "slots")?.elements.length, 1);
    assert.ok(property(metadata, "ownerUpdateProgram"),
      `${name} lacks compiled numeric owner program`);
    const descriptors = compiledNumericDescriptors(transformed.code).filter((entry) =>
      entry.ownerProgramId?.endsWith(`#component:${name}`));
    assert.equal(descriptors.length, 1, `${name} lacks one scalar World sink`);
    assert.ok(descriptors[0].closedExpressionKinds.includes("input"));
  }
  assert.match(transformed.code, /renderCollectionAt\(/,
    "compiled collection mapping disappeared");
  await writeFile(path.join(artifactDirectory, "compiler-proof.json"),
    JSON.stringify(compilerProof, null, 2) + "\n", { flag: "wx" });

  const emitted = await transformWithOxc(transformed.code, sourcePath, {
    lang: "tsx",
    jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" },
  });
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  app = await import(pathToFileURL(outputPath).href);
  app.firstA.resolve("old-a");
  await Promise.resolve();

  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  const domRoot = createNativeRoot(host, container, {
    rootId: `compiled-joint-dom-${randomUUID()}`, scheduleCommit() {},
  });
  dom = { root: domRoot, container };
  domRoot.mount(jsx(app.AppDom, {}));
  await settleFlush(domRoot);
  const section = container.children[0];
  const domA = locate(section, (node) => node.tag === "div" && text(node) === "old-a");
  const domJoint = locate(section, (node) => node.tag === "output" &&
    Object.hasOwn(node.props, "data-joint"));
  const domWorld = locate(section, (node) => node.tag === "output" &&
    Object.hasOwn(node.props, "data-world"));
  const domList = locate(section, (node) => node.tag === "ul");
  assert.ok(domA && domJoint && domWorld && domList);
  assert.deepEqual([domJoint.props["data-joint"], domWorld.props["data-world"]], [11, 0]);
  assert.deepEqual(rowOrder(domList), ["a", "b", "c"]);
  const domRowsBefore = new Map(domList.children.map((node) => [node.props["data-row"], node]));

  const scene = new THREE.Scene();
  three = createThreeNativeRoot(scene, {
    namespace: THREE,
    rootOptions: { rootId: `compiled-joint-three-${randomUUID()}`,
      scheduleCommit() {} },
  });
  three.root.mount(jsx(app.AppThree, {}));
  await settleFlush(three.root);
  const threeApp = scene.children[0];
  assert.ok(threeApp instanceof THREE.Group);
  const threeA = threeApp.children.find((node) =>
    node instanceof THREE.Group && node.name === "old-a");
  const threeJoint = threeApp.children.find((node) =>
    node instanceof THREE.Mesh && node.position.x === 11);
  const threeWorld = threeApp.children.find((node) =>
    node instanceof THREE.Mesh && node.position.x === 0);
  const threeList = threeApp.children.find((node) =>
    node instanceof THREE.Group && node !== threeA);
  assert.ok(threeA && threeJoint && threeWorld && threeList);
  assert.deepEqual(threeList.children.map((node) => node.name), ["a", "b", "c"]);
  const threeRowsBefore = new Map(threeList.children.map((node) => [node.name, node]));
  const jointGeometry = threeJoint.geometry;
  const jointMaterial = threeJoint.material;
  const worldGeometry = threeWorld.geometry;
  const worldMaterial = threeWorld.material;
  assert.equal(app.trace.activations.dom, 1);
  assert.equal(app.trace.activations.three, 1);
  assert.equal(typeof app.trace.controls.dom, "function");
  assert.equal(typeof app.trace.controls.three, "function");

  app.mode.dispatch(1);
  domRoot.flush();
  three.root.flush();
  assert.strictEqual(locate(section, (node) => node === domA), domA);
  assert.strictEqual(threeApp.children.find((node) => node === threeA), threeA);
  assert.equal(text(section), "old-aabc");
  assert.equal(threeA.name, "old-a");

  const domDirty = [];
  const threeDirty = [];
  unsubscribeDom = domRoot.world.subscribeDirtyCells((handle) => domDirty.push(handle));
  unsubscribeThree = three.root.world.subscribeDirtyCells((handle) => threeDirty.push(handle));
  assert.equal(app.trace.controls.dom(5), true);
  assert.equal(app.trace.controls.three(6), true);
  const domCell = domDirty.find((handle) => handle.site.endsWith("#component:WorldDom#state:0"));
  const threeCell = threeDirty.find((handle) => handle.site.endsWith("#component:WorldThree#state:0"));
  assert.ok(domCell && threeCell, "committed World setters did not expose live cells");
  app.position.dispatch(7);
  for (const rows of [app.domRows, app.threeRows]) {
    assert.equal(rows.apply(rows.version, [
      { type: "move", key: "c", beforeKey: "a" },
      { type: "remove", key: "b" },
    ]).ok, true, "authored keyed move/remove was rejected");
  }
  const before = [domRoot.publicationVersion, three.root.publicationVersion];
  const rendersBeforeScoped = {
    dom: { ...app.trace.rowRenders.dom },
    three: { ...app.trace.rowRenders.three },
  };
  const direct = domRoot.prepareTransaction({
    cells: [domCell], collections: [app.domRows], stores: [app.position],
  });
  assert.ok(direct, "actual compiled DOM three-way cut did not prepare");
  assert.equal(direct.validate(), true);
  direct.discard();
  assert.deepEqual([domRoot.publicationVersion, three.root.publicationVersion], before);

  queue = new NativeRootWorkQueue();
  const work = queue.enqueueTransaction({
    id: `compiled-joint-input-${randomUUID()}`,
    roots: [
      { root: domRoot, cells: [domCell], collections: [app.domRows], stores: [app.position] },
      { root: three.root, cells: [threeCell], collections: [app.threeRows], stores: [app.position] },
    ],
    pending: ["ready"],
  });
  assert.equal(work.status, "pending");
  assert.deepEqual([domRoot.publicationVersion, three.root.publicationVersion], before,
    "grouped work published before readiness");
  assert.deepEqual([domJoint.props["data-joint"], domWorld.props["data-world"]], [11, 0]);
  assert.deepEqual([threeJoint.position.x, threeWorld.position.x], [11, 0]);
  assert.deepEqual(rowOrder(domList), ["a", "b", "c"]);
  assert.deepEqual(threeList.children.map((node) => node.name), ["a", "b", "c"]);
  work.resolve("ready");
  assert.equal(work.status, "committed", "grouped three-way transaction did not commit");
  assert.deepEqual([domRoot.publicationVersion, three.root.publicationVersion],
    before.map((version) => version + 1), "grouped cut did not publish exactly one revision per root");
  assert.strictEqual(locate(section, (node) => node === domA), domA);
  assert.strictEqual(domJoint.props["data-joint"], 17);
  assert.strictEqual(domWorld.props["data-world"], 5);
  assert.deepEqual(rowOrder(domList), ["c", "a"]);
  assert.strictEqual(domList.children[0], domRowsBefore.get("c"));
  assert.strictEqual(domList.children[1], domRowsBefore.get("a"));
  assert.strictEqual(threeJoint.position.x, 17);
  assert.strictEqual(threeWorld.position.x, 6);
  assert.deepEqual(threeList.children.map((node) => node.name), ["c", "a"]);
  assert.strictEqual(threeList.children[0], threeRowsBefore.get("c"));
  assert.strictEqual(threeList.children[1], threeRowsBefore.get("a"));
  assert.strictEqual(threeJoint.geometry, jointGeometry);
  assert.strictEqual(threeJoint.material, jointMaterial);
  assert.strictEqual(threeWorld.geometry, worldGeometry);
  assert.strictEqual(threeWorld.material, worldMaterial);
  assert.equal(app.trace.rowCleanups.dom.b, 1);
  assert.equal(app.trace.rowCleanups.three.b, 1);
  for (const renderer of ["dom", "three"]) {
    for (const id of ["a", "b", "c"]) {
      assert.ok(rendersBeforeScoped[renderer][id] >= 1);
      assert.equal(app.trace.rowRenders[renderer][id], rendersBeforeScoped[renderer][id],
        `${renderer} row ${id} rerendered during scoped preparation or publication`);
    }
  }
  assert.equal(domRoot.diagnostics().pendingChangeCount, 0);
  assert.equal(three.root.diagnostics().pendingChangeCount, 0);
  assert.equal(text(section), "old-aca");
  assert.equal(threeA.name, "old-a");

  app.nextA.resolve("new-a");
  await settleFlush(domRoot);
  await settleFlush(three.root);
  assert.equal(text(section), "new-aca");
  assert.equal(threeApp.children.find((node) => node instanceof THREE.Group &&
    node.name === "new-a"), threeA);
  assert.strictEqual(locate(section, (node) => node === domJoint), domJoint);
  assert.deepEqual([domJoint.props["data-joint"], domWorld.props["data-world"]], [17, 5]);
  assert.deepEqual([threeJoint.position.x, threeWorld.position.x], [17, 6]);
  assert.deepEqual(rowOrder(domList), ["c", "a"]);
  assert.deepEqual(threeList.children.map((node) => node.name), ["c", "a"]);

  const acceptedDomRows = rowOrder(domList);
  const acceptedThreeRows = threeList.children.map((node) => node.name);
  const acceptedVersions = [domRoot.publicationVersion, three.root.publicationVersion];
  queue.dispose(); queue = undefined;
  domRoot.dispose();
  assert.equal(container.children.length, 0);
  assert.equal(domRoot.diagnostics().ownerCount, 0);
  three.root.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(three.root.diagnostics().ownerCount, 0);
  assert.equal(three.host.diagnostics.liveHandles, 0);
  three.host.dispose();
  assert.equal(three.host.diagnostics.liveResources, 0);
  assert.equal(three.host.diagnostics.createdResources,
    three.host.diagnostics.disposedResources);
  for (const renderer of ["dom", "three"]) {
    assert.equal(app.trace.activations[renderer], app.trace.cleanups[renderer]);
    for (const id of ["a", "b", "c"]) {
      assert.equal(app.trace.rowMounts[renderer][id], app.trace.rowCleanups[renderer][id]);
    }
  }
  await writeFile(path.join(artifactDirectory, "result.json"),
    JSON.stringify({ status: "PASS", compilerProof, versionsBefore: before,
      versionsAfter: acceptedVersions,
      domRows: acceptedDomRows, threeRows: acceptedThreeRows },
    null, 2) + "\n", { flag: "wx" });
} catch (error) {
  primaryError = error;
  if (artifactDirectory) {
    await writeFile(path.join(artifactDirectory, "failure.json"),
      JSON.stringify({ status: "FAIL", error: String(error?.stack ?? error) },
      null, 2) + "\n", { flag: "wx" }).catch(() => {});
  }
}
const cleanupErrors = [];
try { unsubscribeDom?.(); } catch (error) { cleanupErrors.push(error); }
try { unsubscribeThree?.(); } catch (error) { cleanupErrors.push(error); }
try { queue?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { dom?.root.dispose(); } catch (error) { cleanupErrors.push(error); }
try { three?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
if (primaryError && cleanupErrors.length) {
  throw new AggregateError([primaryError, ...cleanupErrors],
    "Compiled joint input fixture and cleanup both failed", { cause: primaryError });
}
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors,
  "Compiled joint input cleanup failed");
console.log("PASS compiled joint input transaction: actual Rust/OXC Store+World+collection cuts publish as one grouped DOM/Three revision while unrelated resource remains pending.");
console.log(`Evidence artifacts: ${artifactDirectory}`);
