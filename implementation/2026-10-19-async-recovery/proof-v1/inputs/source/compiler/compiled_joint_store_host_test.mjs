import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { transformWithOxc } from "vite";
import * as THREE from "three";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";

const projectRoot = path.resolve(".");
const runtimeUrl = pathToFileURL(path.join(projectRoot, "src/native_runtime_api.ts")).href;
const authored = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { Suspense, use, createStore, jsx } from ${JSON.stringify(runtimeUrl)};
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
  return <output key="joint-dom" data-sum={x + y} />;
}
export function PositionDom(props) {
  const x = use(props.position);
  return <output key="position-dom" data-position={x * 2} />;
}
export function JointThree(props) {
  const x = use(props.position);
  const y = use(props.camera);
  return <mesh key="joint-three" position-x={x + y} />;
}
export function PositionThree(props) {
  const x = use(props.position);
  return <mesh key="position-three" position-x={x * 2} />;
}
export function AppDom() {
  return <section>
    <Suspense fallback={<div key="a-host">a-loading</div>}>
      <ADom key="a-child" />
    </Suspense>
    <JointDom key="joint-child" position={position} camera={camera} />
    <PositionDom key="position-child" position={position} />
  </section>;
}
export function AppThree() {
  return <group key="app-group">
    <Suspense fallback={<group key="a-group" name="a-loading" />}>
      <AThree key="a-child" />
    </Suspense>
    <JointThree key="joint-child" position={position} camera={camera} />
    <PositionThree key="position-child" position={position} />
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
const treeText = (node) => (node.text ?? "") + node.children.map(treeText).join("");
const settleFlush = async (root) => {
  for (let index = 0; index < 5; index++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  root.flush();
};
const threeChildren = (scene) => {
  const app = scene.children.find((child) => child instanceof THREE.Group);
  return {
    a: app?.children.find((child) => child instanceof THREE.Group && child.name !== ""),
    joint: app?.children.find((child) => child instanceof THREE.Mesh && child.position.x === 11),
    meshes: app?.children.filter((child) => child instanceof THREE.Mesh) ?? [],
  };
};
const accept = (candidate) => {
  assert.equal(candidate.validate(), true);
  candidate.commitHost();
  assert.equal(candidate.validatePostHost(), true);
  candidate.preparePublication();
  candidate.publish();
  candidate.installSubscriptions();
  candidate.runEffects();
};

const plugin = nativeModuleCompilerPlugin({
  root: projectRoot,
  compilerBinary: path.join(projectRoot,
    "compiler/oxc-spike/target/debug/ui-graph-compiler-spike"),
});
const context = {
  addWatchFile() {},
  error(message) { throw new Error(String(message)); },
};
const roots = [];
let three;
let primaryError;
let artifactDirectory;
try {
  const cacheDirectory = path.join(projectRoot, ".cache");
  await mkdir(cacheDirectory, { recursive: true });
  artifactDirectory = path.join(cacheDirectory,
    `compiled-joint-store-host-${randomUUID()}`);
  await mkdir(artifactDirectory, { recursive: false });
  const sourcePath = path.join(artifactDirectory, "joint-store.tsx");
  const transformedPath = path.join(artifactDirectory, "joint-store.transformed.tsx");
  const outputPath = path.join(artifactDirectory, "joint-store.mjs");
  await writeFile(sourcePath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, sourcePath);
  assert.ok(transformed?.code, "authored joint Store TSX did not compile through Rust/OXC");
  await writeFile(transformedPath, transformed.code, { flag: "wx" });
  const ast = parse(transformed.code, {
    sourceType: "module", plugins: ["typescript", "jsx"],
  });
  const proofs = [];
  for (const [name, tag, key, prop] of [
    ["JointDom", "output", "joint-dom", "data-sum"],
    ["JointThree", "mesh", "joint-three", "position-x"],
  ]) {
    const registrations = registrationsFor(ast, `#component:${name}`);
    assert.equal(registrations.length, 1, `${name} lacks actual registration`);
    assert.equal(registrations[0].arguments[1]?.name, name);
    const id = stringValue(registrations[0].arguments[0]);
    const program = property(registrations[0].arguments[2], "closedStoreHostProgram");
    assert.equal(program?.type, "ObjectExpression", `${name} lacks joint Store IR`);
    assert.equal(property(program, "schemaVersion")?.value, 2);
    assert.equal(stringValue(property(program, "componentProgramId")), id);
    const revision = stringValue(property(program, "moduleRevision"));
    assert.ok(revision);
    const inputs = property(program, "inputs");
    assert.equal(inputs?.type, "ArrayExpression");
    assert.deepEqual(inputs.elements.map((entry) =>
      stringValue(property(entry, "storeProp"))), ["position", "camera"]);
    assert.deepEqual(inputs.elements.map((entry) =>
      stringValue(property(entry, "storeUseSiteId"))),
    [`${id}#store:0`, `${id}#store:1`]);
    const host = property(program, "host");
    assert.equal(stringValue(property(host, "tag")), tag);
    assert.equal(stringValue(property(host, "key")), key);
    assert.equal(property(host, "child")?.type, "NullLiteral");
    const props = property(host, "props");
    assert.equal(props?.type, "ArrayExpression");
    assert.equal(props.elements.length, 1);
    assert.equal(stringValue(props.elements[0].elements[0]), prop);
    const expression = props.elements[0].elements[1];
    assert.equal(stringValue(property(expression, "kind")), "binary");
    assert.equal(stringValue(property(expression, "operator")), "+");
    assert.equal(property(property(expression, "left"), "index")?.value, 0);
    assert.equal(property(property(expression, "right"), "index")?.value, 1);
    proofs.push({ name, id, revision, inputs: ["position", "camera"], tag, key });
  }
  for (const name of ["PositionDom", "PositionThree"]) {
    const registrations = registrationsFor(ast, `#component:${name}`);
    assert.equal(registrations.length, 1);
    const program = property(registrations[0].arguments[2], "closedStoreHostProgram");
    assert.equal(property(program, "schemaVersion")?.value, 1,
      `${name} schema-1 compatibility regressed`);
    assert.equal(stringValue(property(program, "storeProp")), "position");
  }
  assert.equal(proofs[0].revision, proofs[1].revision);
  await writeFile(path.join(artifactDirectory, "joint-store-programs.json"),
    JSON.stringify(proofs, null, 2) + "\n", { flag: "wx" });

  const emitted = await transformWithOxc(transformed.code, sourcePath, {
    lang: "tsx",
    jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" },
  });
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  const app = await import(pathToFileURL(outputPath).href);
  app.firstA.resolve("old-a");
  await Promise.resolve();
  const makeDom = (id) => {
    const host = new MemoryVDOMHost();
    const container = host.createContainer();
    const root = createNativeRoot(host, container, {
      rootId: `compiled-joint-store-${id}`, scheduleCommit() {},
    });
    roots.push(root);
    root.mount(jsx(app.AppDom, {}));
    return { root, container };
  };
  const first = makeDom("first");
  const second = makeDom("second");
  await settleFlush(first.root);
  await settleFlush(second.root);
  const output = (container, propertyName) => locate(container, (node) =>
    node.tag === "output" && Object.hasOwn(node.props, propertyName));
  const firstJoint = output(first.container, "data-sum");
  const firstPosition = output(first.container, "data-position");
  const secondJoint = output(second.container, "data-sum");
  const secondPosition = output(second.container, "data-position");
  const firstAHost = locate(first.container, (node) => node.tag === "div" &&
    treeText(node) === "old-a");
  const secondAHost = locate(second.container, (node) => node.tag === "div" &&
    treeText(node) === "old-a");
  assert.ok(firstJoint && firstPosition && secondJoint && secondPosition &&
    firstAHost && secondAHost);
  assert.deepEqual([firstJoint.props["data-sum"], firstPosition.props["data-position"]], [11, 2]);
  assert.deepEqual([secondJoint.props["data-sum"], secondPosition.props["data-position"]], [11, 2]);
  assert.notStrictEqual(firstJoint, secondJoint);

  const scene = new THREE.Scene();
  three = createThreeNativeRoot(scene, {
    namespace: THREE,
    rootOptions: { rootId: `compiled-joint-store-three-${randomUUID()}`,
      scheduleCommit() {} },
  });
  three.root.mount(jsx(app.AppThree, {}));
  await settleFlush(three.root);
  const initialThree = threeChildren(scene);
  assert.ok(initialThree.a instanceof THREE.Group);
  assert.equal(initialThree.a.name, "old-a");
  assert.equal(initialThree.meshes.length, 2);
  const threeJoint = initialThree.joint;
  const threePosition = initialThree.meshes.find((mesh) => mesh !== threeJoint);
  assert.ok(threeJoint && threePosition);
  assert.equal(threePosition.position.x, 2);
  const geometry = threeJoint.geometry;
  const material = threeJoint.material;

  app.mode.dispatch(1);
  first.root.flush();
  second.root.flush();
  three.root.flush();
  assert.strictEqual(locate(first.container, (node) => node === firstAHost), firstAHost);
  assert.strictEqual(locate(second.container, (node) => node === secondAHost), secondAHost);
  assert.strictEqual(threeChildren(scene).a, initialThree.a);
  assert.equal(initialThree.a.name, "old-a");

  app.position.dispatch(2);
  const stale = first.root.prepareStores([app.position]);
  assert.ok(stale, "selected position did not capture its joint camera dependency");
  app.camera.dispatch(20);
  assert.equal(stale.validate(), false,
    "camera changed after preparation but joint candidate remained current");
  stale.discard();
  assert.equal(first.root.flush(), true,
    "ordinary flush did not publish the complete joint Store cut");
  assert.strictEqual(output(first.container, "data-sum"), firstJoint);
  assert.strictEqual(output(first.container, "data-position"), firstPosition);
  assert.deepEqual([firstJoint.props["data-sum"], firstPosition.props["data-position"]], [22, 4]);
  assert.strictEqual(locate(first.container, (node) => node === firstAHost), firstAHost);
  assert.equal(treeText(first.container), "old-a");
  assert.deepEqual([secondJoint.props["data-sum"], secondPosition.props["data-position"]], [11, 2],
    "first root consumed second root accepted Store history");
  assert.deepEqual([threeJoint.position.x, threePosition.position.x], [11, 2],
    "first DOM root consumed Three root accepted Store history");

  assert.equal(second.root.flush(), true);
  assert.equal(three.root.flush(), true);
  assert.strictEqual(output(second.container, "data-sum"), secondJoint);
  assert.strictEqual(output(second.container, "data-position"), secondPosition);
  assert.deepEqual([secondJoint.props["data-sum"], secondPosition.props["data-position"]], [22, 4]);
  assert.strictEqual(threeChildren(scene).a, initialThree.a);
  assert.ok(threeChildren(scene).meshes.includes(threeJoint));
  assert.ok(threeChildren(scene).meshes.includes(threePosition));
  assert.deepEqual([threeJoint.position.x, threePosition.position.x], [22, 4]);
  assert.strictEqual(threeJoint.geometry, geometry);
  assert.strictEqual(threeJoint.material, material);

  app.camera.dispatch(30);
  assert.equal(first.root.flush(), true);
  assert.deepEqual([firstJoint.props["data-sum"], firstPosition.props["data-position"]], [32, 4]);
  assert.deepEqual([secondJoint.props["data-sum"], secondPosition.props["data-position"]], [22, 4]);
  assert.deepEqual([threeJoint.position.x, threePosition.position.x], [22, 4]);
  assert.equal(second.root.flush(), true);
  assert.equal(three.root.flush(), true);
  assert.deepEqual([secondJoint.props["data-sum"], secondPosition.props["data-position"]], [32, 4]);
  assert.deepEqual([threeJoint.position.x, threePosition.position.x], [32, 4]);

  app.nextA.resolve("new-a");
  await settleFlush(first.root);
  await settleFlush(second.root);
  await settleFlush(three.root);
  assert.equal(treeText(first.container), "new-a");
  assert.equal(treeText(second.container), "new-a");
  assert.strictEqual(output(first.container, "data-sum"), firstJoint);
  assert.strictEqual(output(second.container, "data-sum"), secondJoint);
  assert.equal(firstJoint.props["data-sum"], 32);
  assert.equal(secondJoint.props["data-sum"], 32);
  assert.equal(threeChildren(scene).a.name, "new-a");
  assert.ok(threeChildren(scene).meshes.includes(threeJoint));
  assert.deepEqual([threeJoint.position.x, threePosition.position.x], [32, 4]);

  for (const { root, container } of [first, second]) {
    root.dispose();
    assert.equal(container.children.length, 0);
    assert.equal(root.diagnostics().ownerCount, 0);
  }
  three.root.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(three.root.diagnostics().ownerCount, 0);
  assert.equal(three.host.diagnostics.liveHandles, 0);
  three.host.dispose();
  assert.equal(three.host.diagnostics.liveResources, 0);
  assert.equal(three.host.diagnostics.createdResources,
    three.host.diagnostics.disposedResources);
} catch (error) {
  primaryError = error;
}
const cleanupErrors = [];
for (const root of roots) {
  try { root.dispose(); } catch (error) { cleanupErrors.push(error); }
}
try { three?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
if (primaryError && cleanupErrors.length) {
  throw new AggregateError([primaryError, ...cleanupErrors],
    "Compiled joint Store-host fixture and cleanup both failed", { cause: primaryError });
}
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors,
  "Compiled joint Store-host cleanup failed");
console.log("PASS compiled joint Store-host: actual Rust/OXC DOM and Three data programs publish complete numeric dependencies beside pending A and preserve independent roots and host lifetimes.");
console.log(`Evidence artifacts: ${artifactDirectory}`);
