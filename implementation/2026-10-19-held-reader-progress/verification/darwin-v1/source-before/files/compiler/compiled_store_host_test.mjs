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
export const numberStore = createStore(1, (_state, action) => action);
export const opaqueStore = createStore(1, (_state, action) => action);
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
export function BDom(props) {
  const value = use(props.store);
  return <output key="b-host" data-value={value * 2} />;
}
export function BThree(props) {
  const value = use(props.store);
  return <mesh key="b-mesh" position-x={value * 2} />;
}
export function Opaque(props) {
  const value = use(props.store);
  return <output key="opaque-host" data-value={Math.round(value)} />;
}
export function AppDom() {
  return <section>
    <Suspense fallback={<div key="a-host">a-loading</div>}>
      <ADom key="a-child" />
    </Suspense>
    <BDom key="b-child" store={numberStore} />
  </section>;
}
export function AppThree() {
  return <group key="app-group">
    <Suspense fallback={<group key="a-group" name="a-loading" />}>
      <AThree key="a-child" />
    </Suspense>
    <BThree key="b-child" store={numberStore} />
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
    app,
    a: app?.children.find((child) => child instanceof THREE.Group && child.name !== ""),
    b: app?.children.find((child) => child instanceof THREE.Mesh),
  };
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
    `compiled-store-host-${randomUUID()}`);
  await mkdir(artifactDirectory, { recursive: false });
  const sourcePath = path.join(artifactDirectory, "store-host.tsx");
  const transformedPath = path.join(artifactDirectory, "store-host.transformed.tsx");
  const outputPath = path.join(artifactDirectory, "store-host.mjs");
  await writeFile(sourcePath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, sourcePath);
  assert.ok(transformed?.code, "authored Store-host TSX did not compile through Rust/OXC");
  await writeFile(transformedPath, transformed.code, { flag: "wx" });
  const ast = parse(transformed.code, {
    sourceType: "module", plugins: ["typescript", "jsx"],
  });
  const proofs = [];
  for (const [name, tag, key, prop] of [
    ["BDom", "output", "b-host", "data-value"],
    ["BThree", "mesh", "b-mesh", "position-x"],
  ]) {
    const registrations = registrationsFor(ast, `#component:${name}`);
    assert.equal(registrations.length, 1, `${name} has no actual registration`);
    assert.equal(registrations[0].arguments[1]?.name, name);
    const id = stringValue(registrations[0].arguments[0]);
    const program = property(registrations[0].arguments[2], "closedStoreHostProgram");
    assert.equal(program?.type, "ObjectExpression", `${name} lacks closed Store IR`);
    assert.equal(property(program, "schemaVersion")?.value, 1);
    assert.equal(stringValue(property(program, "componentProgramId")), id);
    const revision = stringValue(property(program, "moduleRevision"));
    assert.ok(revision, `${name} lacks module revision`);
    const site = stringValue(property(program, "storeUseSiteId"));
    assert.match(site ?? "", new RegExp(`#component:${name}#store:0$`));
    assert.equal(stringValue(property(program, "storeProp")), "store");
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
    assert.equal(stringValue(property(expression, "operator")), "*");
    assert.equal(stringValue(property(property(expression, "left"), "kind")), "input");
    assert.equal(property(property(expression, "left"), "index")?.value, 0);
    assert.equal(property(property(expression, "right"), "value")?.value, 2);
    proofs.push({ name, id, revision, site, tag, key, prop });
  }
  assert.equal(registrationsFor(ast, "#component:Opaque").length, 1);
  assert.equal(property(registrationsFor(ast, "#component:Opaque")[0].arguments[2],
    "closedStoreHostProgram"), undefined,
  "opaque Math.round component was incorrectly certified");
  assert.equal(proofs[0].revision, proofs[1].revision);
  await writeFile(path.join(artifactDirectory, "closed-store-programs.json"),
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
      rootId: `compiled-store-host-${id}`, scheduleCommit() {},
    });
    roots.push(root);
    root.mount(jsx(app.AppDom, {}));
    return { root, container };
  };
  const first = makeDom("first");
  const second = makeDom("second");
  await settleFlush(first.root);
  await settleFlush(second.root);
  const domB = (container) => locate(container, (node) => node.tag === "output");
  const firstB = domB(first.container);
  const secondB = domB(second.container);
  const firstA = locate(first.container, (node) => node.tag === "div" &&
    treeText(node) === "old-a");
  const secondA = locate(second.container, (node) => node.tag === "div" &&
    treeText(node) === "old-a");
  assert.ok(firstA && secondA && firstB && secondB);
  assert.notStrictEqual(firstB, secondB);
  assert.equal(firstB.props["data-value"], 2);
  assert.equal(secondB.props["data-value"], 2);

  const scene = new THREE.Scene();
  three = createThreeNativeRoot(scene, {
    namespace: THREE,
    rootOptions: { rootId: `compiled-store-host-three-${randomUUID()}`,
      scheduleCommit() {} },
  });
  three.root.mount(jsx(app.AppThree, {}));
  await settleFlush(three.root);
  const mounted = threeChildren(scene);
  assert.ok(mounted.a instanceof THREE.Group);
  assert.equal(mounted.a.name, "old-a");
  assert.ok(mounted.b instanceof THREE.Mesh);
  assert.equal(mounted.b.position.x, 2);
  const geometry = mounted.b.geometry;
  const material = mounted.b.material;

  const opaqueHost = new MemoryVDOMHost();
  const opaqueContainer = opaqueHost.createContainer();
  const opaqueRoot = createNativeRoot(opaqueHost, opaqueContainer, {
    rootId: `compiled-store-host-opaque-${randomUUID()}`, scheduleCommit() {},
  });
  roots.push(opaqueRoot);
  opaqueRoot.mount(jsx(app.Opaque, { store: app.opaqueStore }));
  assert.equal(opaqueRoot.prepareStores([app.opaqueStore]), null,
    "opaque expression entered closed Store-host preparation");

  app.mode.dispatch(1);
  first.root.flush();
  second.root.flush();
  three.root.flush();
  assert.strictEqual(locate(first.container, (node) => node === firstA), firstA);
  assert.strictEqual(locate(second.container, (node) => node === secondA), secondA);
  assert.strictEqual(threeChildren(scene).a, mounted.a);
  assert.equal(mounted.a.name, "old-a");

  app.numberStore.dispatch(2);
  assert.equal(first.root.flush(), true,
    "ordinary flush did not publish DOM closed Store prop beside pending A");
  assert.strictEqual(domB(first.container), firstB);
  assert.equal(firstB.props["data-value"], 4);
  assert.strictEqual(locate(first.container, (node) => node === firstA), firstA);
  assert.equal(treeText(first.container), "old-a");
  assert.strictEqual(domB(second.container), secondB);
  assert.equal(secondB.props["data-value"], 2,
    "first root consumed second root Store history");
  assert.equal(mounted.b.position.x, 2,
    "first DOM cut consumed Three root Store history");

  assert.equal(second.root.flush(), true);
  assert.strictEqual(domB(second.container), secondB);
  assert.equal(secondB.props["data-value"], 4);
  assert.strictEqual(locate(second.container, (node) => node === secondA), secondA);
  assert.equal(three.root.flush(), true);
  assert.strictEqual(threeChildren(scene).b, mounted.b);
  assert.strictEqual(threeChildren(scene).a, mounted.a);
  assert.equal(mounted.b.position.x, 4);
  assert.strictEqual(mounted.b.geometry, geometry);
  assert.strictEqual(mounted.b.material, material);

  app.nextA.resolve("new-a");
  await settleFlush(first.root);
  await settleFlush(second.root);
  await settleFlush(three.root);
  assert.equal(treeText(first.container), "new-a");
  assert.equal(treeText(second.container), "new-a");
  assert.strictEqual(domB(first.container), firstB);
  assert.strictEqual(domB(second.container), secondB);
  assert.equal(firstB.props["data-value"], 4);
  assert.equal(secondB.props["data-value"], 4);
  assert.equal(threeChildren(scene).a.name, "new-a");
  assert.strictEqual(threeChildren(scene).b, mounted.b);
  assert.equal(mounted.b.position.x, 4);

  for (const { root, container } of [first, second]) {
    root.dispose();
    assert.equal(container.children.length, 0);
    assert.equal(root.diagnostics().ownerCount, 0);
  }
  opaqueRoot.dispose();
  assert.equal(opaqueContainer.children.length, 0);
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
    "Compiled Store-host fixture and cleanup both failed", { cause: primaryError });
}
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors,
  "Compiled Store-host cleanup failed");
console.log("PASS compiled Store-host: Rust/OXC closed DOM and Three leaves publish during pending A, roots retain independent history, opaque expression declines, and disposal balances.");
console.log(`Evidence artifacts: ${artifactDirectory}`);
