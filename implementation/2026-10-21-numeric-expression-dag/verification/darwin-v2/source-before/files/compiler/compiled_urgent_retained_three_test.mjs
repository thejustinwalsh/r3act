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
import { jsx } from "../src/native_runtime_api.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";

const projectRoot = path.resolve(".");
const runtimeUrl = pathToFileURL(path.join(projectRoot, "src/native_runtime_api.ts")).href;
const authored = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { Suspense, use, createStore, useState, useEffect, jsx } from ${JSON.stringify(runtimeUrl)};
export function deferred() {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
}
export const firstA = deferred();
export const nextA = deferred();
export const mode = createStore(0, (_state, action) => action);
export const trace = { setter: null, activations: 0, cleanups: 0 };
export function A() {
  const selected = use(mode) === 0 ? firstA.promise : nextA.promise;
  const value = use(selected);
  return <group key="a-group" name={value} />;
}
export function B() {
  const [x, setX] = useState(1);
  useEffect(() => {
    trace.setter = setX;
    trace.activations++;
    return () => {
      trace.cleanups++;
      if (trace.setter === setX) trace.setter = null;
    };
  });
  return <mesh key="b-mesh" position-x={x} />;
}
export function App() {
  return <group key="app-group">
    <Suspense fallback={<group key="a-group" name="a-loading" />}>
      <A key="a-child" />
    </Suspense>
    <B key="b-child" />
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
const settleFlush = async (root) => {
  for (let index = 0; index < 5; index++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  root.flush();
};
const mounted = (scene) => {
  const app = scene.children.find((child) => child instanceof THREE.Group);
  return {
    app,
    a: app?.children.find((child) =>
      child instanceof THREE.Group && child.name !== ""),
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
let native;
let primaryError;
let artifactDirectory;
try {
  const cacheDirectory = path.join(projectRoot, ".cache");
  await mkdir(cacheDirectory, { recursive: true });
  artifactDirectory = path.join(cacheDirectory,
    `compiled-urgent-retained-three-${randomUUID()}`);
  await mkdir(artifactDirectory, { recursive: false });
  const sourcePath = path.join(artifactDirectory, "urgent-three.tsx");
  const transformedPath = path.join(artifactDirectory, "urgent-three.transformed.tsx");
  const outputPath = path.join(artifactDirectory, "urgent-three.mjs");
  await writeFile(sourcePath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, sourcePath);
  assert.ok(transformed?.code, "authored Three TSX did not compile through Rust/OXC");
  await writeFile(transformedPath, transformed.code, { flag: "wx" });

  const ast = parse(transformed.code, {
    sourceType: "module", plugins: ["typescript", "jsx"],
  });
  const registrations = registrationsFor(ast, "#component:B");
  assert.equal(registrations.length, 1,
    "Three B needs one actual defineComponent registration");
  assert.equal(registrations[0].arguments[1]?.name, "B");
  const metadata = registrations[0].arguments[2];
  const layout = property(metadata, "stateLayout");
  assert.equal(layout?.type, "ObjectExpression", "Three B has no state layout");
  assert.match(stringValue(property(layout, "programId")) ?? "", /#component:B$/);
  assert.ok(stringValue(property(layout, "moduleRevision")),
    "Three B layout lacks a module revision");
  const slots = property(layout, "slots");
  assert.equal(slots?.type, "ArrayExpression");
  assert.equal(slots.elements.length, 1);
  const stateSite = stringValue(property(slots.elements[0], "siteId"));
  assert.match(stateSite ?? "", /#component:B#state:0$/);
  const propOnlySites = property(metadata, "propOnlySites");
  assert.equal(propOnlySites?.type, "ArrayExpression");
  assert.deepEqual(propOnlySites.elements.map(stringValue), [stateSite]);
  assert.ok(property(metadata, "ownerUpdateProgram"),
    "Three B has no compiled numeric owner program");
  const descriptors = compiledNumericDescriptors(transformed.code)
    .filter((entry) => entry.ownerProgramId?.endsWith("#component:B"));
  assert.equal(descriptors.length, 1,
    "Three B needs one position-x scalar sink");
  assert.deepEqual(descriptors[0].sourceSites, [stateSite]);
  assert.ok(descriptors[0].closedExpressionKinds.includes("input"),
    "position-x lacks a closed scalar expression");
  await writeFile(path.join(artifactDirectory, "numeric-program.json"),
    JSON.stringify({ stateSite, descriptor: descriptors[0] }, null, 2) + "\n",
    { flag: "wx" });

  const emitted = await transformWithOxc(transformed.code, sourcePath, {
    lang: "tsx",
    jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" },
  });
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  const app = await import(pathToFileURL(outputPath).href);
  app.firstA.resolve("old-a");
  await Promise.resolve();

  const scene = new THREE.Scene();
  native = createThreeNativeRoot(scene, {
    namespace: THREE,
    rootOptions: {
      rootId: `compiled-urgent-three-${randomUUID()}`,
      scheduleCommit() {},
    },
  });
  native.root.mount(jsx(app.App, {}));
  await settleFlush(native.root);
  const initial = mounted(scene);
  assert.ok(initial.app instanceof THREE.Group);
  assert.ok(initial.a instanceof THREE.Group);
  assert.equal(initial.a.name, "old-a");
  assert.ok(initial.b instanceof THREE.Mesh);
  assert.equal(initial.b.position.x, 1);
  assert.ok(initial.b.geometry instanceof THREE.BufferGeometry,
    "default Mesh lacks host-owned fallback geometry");
  assert.ok(initial.b.material instanceof THREE.MeshBasicMaterial,
    "default Mesh lacks host-owned fallback material");
  const fallbackGeometry = initial.b.geometry;
  const fallbackMaterial = initial.b.material;
  let geometryDisposals = 0;
  let materialDisposals = 0;
  const disposeGeometry = fallbackGeometry.dispose.bind(fallbackGeometry);
  const disposeMaterial = fallbackMaterial.dispose.bind(fallbackMaterial);
  fallbackGeometry.dispose = () => { geometryDisposals++; disposeGeometry(); };
  fallbackMaterial.dispose = () => { materialDisposals++; disposeMaterial(); };
  assert.equal(app.trace.activations, 1,
    "Three B setter was not installed by committed effect activation");
  const committedSetter = app.trace.setter;
  assert.equal(typeof committedSetter, "function");

  app.mode.dispatch(1);
  native.root.flush();
  assert.strictEqual(mounted(scene).a, initial.a);
  assert.equal(initial.a.name, "old-a",
    "Store-selected pending A replaced accepted Three group");
  assert.strictEqual(app.trace.setter, committedSetter,
    "blocked speculative render replaced committed Three setter");
  assert.equal(committedSetter(4), true);
  assert.equal(native.root.flush(), true,
    "ordinary Three flush did not publish closed position-x beside pending A");
  assert.strictEqual(mounted(scene).a, initial.a);
  assert.strictEqual(mounted(scene).b, initial.b);
  assert.equal(initial.a.name, "old-a");
  assert.equal(initial.b.position.x, 4,
    "closed Three scalar writer did not reach the live Mesh");

  app.nextA.resolve("new-a");
  await settleFlush(native.root);
  assert.equal(mounted(scene).a.name, "new-a");
  assert.strictEqual(mounted(scene).b, initial.b,
    "later A retry replaced accepted Three Mesh");
  assert.equal(initial.b.position.x, 4,
    "later A retry regressed accepted Three scalar property");

  native.root.dispose();
  assert.equal(scene.children.length, 0,
    "Three root disposal left children in the Scene");
  assert.equal(native.root.diagnostics().ownerCount, 0,
    "Three root disposal left live owners");
  assert.equal(native.host.diagnostics.liveHandles, 0,
    "Three root disposal left live host handles");
  assert.equal(app.trace.activations, app.trace.cleanups,
    "Three B committed effect did not clean up");
  assert.equal(app.trace.setter, null);
  assert.deepEqual([geometryDisposals, materialDisposals], [0, 0],
    "root teardown disposed shared fallback resources before host disposal");
  native.host.dispose();
  assert.deepEqual([geometryDisposals, materialDisposals], [1, 1],
    "host did not dispose each shared fallback resource exactly once");
  assert.equal(native.host.diagnostics.liveResources, 0,
    "Three host fallback resources remained live");
  assert.equal(native.host.diagnostics.createdResources,
    native.host.diagnostics.disposedResources,
    "Three host did not dispose its fallback resources once");
} catch (error) {
  primaryError = error;
}

const cleanupErrors = [];
try { native?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
if (primaryError && cleanupErrors.length > 0) {
  throw new AggregateError([primaryError, ...cleanupErrors],
    "Compiled urgent Three fixture and cleanup both failed",
    { cause: primaryError });
}
if (primaryError) throw primaryError;
if (cleanupErrors.length > 0) {
  throw new AggregateError(cleanupErrors,
    "Compiled urgent Three cleanup failed");
}
console.log("PASS compiled urgent Three: actual Rust/OXC position-x publishes during pending Store/resource work, Mesh identity survives A retry, and fallback resources dispose.");
console.log(`Evidence artifacts: ${artifactDirectory}`);
