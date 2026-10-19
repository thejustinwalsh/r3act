import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { transformWithOxc } from "vite";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const projectRoot = path.resolve(".");
const runtimeUrl = pathToFileURL(path.join(projectRoot, "src/native_runtime_api.ts")).href;
const authored = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, Suspense, createStore, use, useState, useEffect, jsx } from ${JSON.stringify(runtimeUrl)};
export function deferred() {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
}
export const old = deferred();
export const older = deferred();
export const newer = deferred();
export const oldGate = deferred();
export const pendingGate = deferred();
export const oldResource = new AsyncResource(old.promise);
export const olderResource = new AsyncResource(older.promise);
export const newerResource = new AsyncResource(newer.promise);
export const oldGateResource = new AsyncResource(oldGate.promise);
export const pendingGateResource = new AsyncResource(pendingGate.promise);
export const gateStore = createStore(oldGateResource, (_state, action) => action);
export const acceptedSelection = createStore(oldResource, (_state, action) => action);
export const pendingSelection = createStore(olderResource, (_state, action) => action);
export const trace = { setter: null, activations: 0, cleanups: 0 };

export function Primary(props) {
  const resource = use(props.selection);
  const value = use(resource);
  const gateResource = use(gateStore);
  const gate = use(gateResource);
  return <div key="primary-host" data-label={props.label}>{value}:{gate}</div>;
}
export function Local() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    trace.setter = setCount;
    trace.activations++;
    return () => {
      trace.cleanups++;
      if (trace.setter === setCount) trace.setter = null;
    };
  });
  return <output key="local-host" data-count={count}>local</output>;
}
export function App(props) {
  return <section>
    <Suspense fallback={<div key="primary-host" data-label="fallback">loading</div>}>
      <Primary key="primary-child" selection={props.selection} label={props.label} />
    </Suspense>
    <Local key="local-child" />
  </section>;
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
const treeText = (node) =>
  (node.text ?? "") + node.children.map(treeText).join("");
const settleFlush = async (root) => {
  for (let index = 0; index < 5; index++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  root.flush();
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
let root;
let primaryError;
let artifactDirectory;
try {
  const cacheDirectory = path.join(projectRoot, ".cache");
  await mkdir(cacheDirectory, { recursive: true });
  artifactDirectory = path.join(cacheDirectory,
    `compiled-direct-intent-${randomUUID()}`);
  await mkdir(artifactDirectory, { recursive: false });
  const sourcePath = path.join(artifactDirectory, "direct-intent.tsx");
  const transformedPath = path.join(artifactDirectory, "direct-intent.transformed.tsx");
  const outputPath = path.join(artifactDirectory, "direct-intent.mjs");
  await writeFile(sourcePath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, sourcePath);
  assert.ok(transformed?.code, "authored direct-intent TSX did not compile through Rust/OXC");
  await writeFile(transformedPath, transformed.code, { flag: "wx" });
  const ast = parse(transformed.code, {
    sourceType: "module", plugins: ["typescript", "jsx"],
  });
  for (const component of ["Primary", "Local", "App"]) {
    const registrations = registrationsFor(ast, `#component:${component}`);
    assert.equal(registrations.length, 1,
      `${component} lacks exactly one actual defineComponent registration`);
    assert.equal(registrations[0].arguments[1]?.name, component,
      `${component} registration points at the wrong function`);
  }
  const local = registrationsFor(ast, "#component:Local")[0];
  const layout = property(local.arguments[2], "stateLayout");
  assert.equal(layout?.type, "ObjectExpression", "Local lacks a compiled state layout");
  assert.match(stringValue(property(layout, "programId")) ?? "",
    /#component:Local$/);
  assert.ok(stringValue(property(layout, "moduleRevision")),
    "Local layout lacks module revision");
  const slots = property(layout, "slots");
  assert.equal(slots?.type, "ArrayExpression");
  assert.equal(slots.elements.length, 1, "Local state slot was not compiled");
  assert.match(stringValue(property(slots.elements[0], "siteId")) ?? "",
    /#component:Local#state:0$/);
  await writeFile(path.join(artifactDirectory, "component-registrations.json"),
    JSON.stringify({ components: ["Primary", "Local", "App"],
      localProgramId: stringValue(property(layout, "programId")),
      moduleRevision: stringValue(property(layout, "moduleRevision")) },
    null, 2) + "\n", { flag: "wx" });

  const emitted = await transformWithOxc(transformed.code, sourcePath, {
    lang: "tsx",
    jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" },
  });
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  const app = await import(pathToFileURL(outputPath).href);
  app.old.resolve("old-value");
  app.oldGate.resolve("old-gate");
  await Promise.resolve();

  const host = new MemoryVDOMHost();
  const container = host.createContainer();
  root = createNativeRoot(host, container, {
    rootId: `compiled-direct-intent-${randomUUID()}`,
    scheduleCommit() {},
  });
  const tree = (selection, label) =>
    jsx(app.App, { selection, label });
  root.mount(tree(app.acceptedSelection, "accepted"));
  await settleFlush(root);
  const primary = locate(container, (node) =>
    node.tag === "div" && node.props["data-label"] === "accepted");
  const localHost = locate(container, (node) => node.tag === "output");
  assert.ok(primary && localHost, "accepted primary and local sibling must mount");
  assert.equal(treeText(primary), "old-value:old-gate");
  assert.equal(localHost.props["data-count"], 1);
  assert.equal(app.trace.activations, 1,
    "local setter was not installed by committed effect activation");
  const localSetter = app.trace.setter;
  assert.equal(typeof localSetter, "function");
  assert.equal(localSetter(5), true);
  assert.equal(root.flush(), true);
  assert.strictEqual(locate(container, (node) => node.tag === "output"), localHost);
  assert.equal(localHost.props["data-count"], 5,
    "local state did not publish before suspended direct updates");

  const acceptedVersion = root.publicationVersion;
  const acceptedGateReaders = app.gateStore.diagnostics().readers;
  assert.ok(acceptedGateReaders > 0, "accepted primary did not commit its gate Store read");
  app.gateStore.dispatch(app.pendingGateResource);
  root.update(tree(app.pendingSelection, "draft-one"));
  root.update(tree(app.pendingSelection, "draft-two"));
  assert.strictEqual(locate(container, (node) =>
    node.tag === "div" && node.props["data-label"] === "accepted"), primary,
  "blocked direct updates replaced the accepted primary host");
  assert.equal(treeText(primary), "old-value:old-gate");
  assert.strictEqual(locate(container, (node) => node.tag === "output"), localHost);
  assert.equal(localHost.props["data-count"], 5,
    "blocked direct updates reset independent local state");
  assert.strictEqual(app.trace.setter, localSetter,
    "blocked speculative render replaced committed local setter");
  assert.equal(root.publicationVersion, acceptedVersion,
    "blocked direct updates advanced accepted root history");
  assert.equal(app.gateStore.diagnostics().readers, acceptedGateReaders,
    "blocked gate read changed accepted Store reader history");
  assert.ok(app.pendingSelection.diagnostics().listeners > 0,
    "newly observed Store must stay subscribed while its intent is pending");
  assert.equal(app.pendingSelection.diagnostics().readers, 0,
    "blocked Store read must not publish accepted reader history");

  app.pendingSelection.dispatch(app.newerResource);
  app.older.resolve("older-value");
  await settleFlush(root);
  assert.equal(root.publicationVersion, acceptedVersion,
    "older settlement advanced accepted history while gate remained pending");
  assert.equal(app.gateStore.diagnostics().readers, acceptedGateReaders,
    "older settlement published speculative gate reader history");
  assert.strictEqual(locate(container, (node) =>
    node.tag === "div" && node.props["data-label"] === "accepted"), primary,
  "older resource settlement published a superseded intent");
  assert.equal(treeText(primary), "old-value:old-gate");
  assert.equal(localHost.props["data-count"], 5);

  app.newer.resolve("newer-value");
  app.pendingGate.resolve("new-gate");
  await settleFlush(root);
  const published = locate(container, (node) =>
    node.tag === "div" && node.props["data-label"] === "draft-two");
  assert.ok(published,
    "latest direct props were not accepted after new Store resource settled");
  assert.strictEqual(published, primary,
    "latest same-key primary unnecessarily replaced accepted host");
  assert.equal(treeText(published), "newer-value:new-gate",
    "latest Store selection did not replace superseded resource");
  assert.strictEqual(locate(container, (node) => node.tag === "output"), localHost);
  assert.equal(localHost.props["data-count"], 5);
  assert.equal(app.pendingSelection.diagnostics().readers > 0, true,
    "accepted latest Store read did not publish reader history");

  root.dispose();
  assert.equal(container.children.length, 0,
    "direct-intent root disposal left host children");
  assert.equal(root.diagnostics().ownerCount, 0,
    "direct-intent root disposal left live owners");
  assert.equal(root.diagnostics().disposed, true);
  assert.equal(app.trace.activations, app.trace.cleanups,
    "local committed effect setup and cleanup are unbalanced");
  assert.equal(app.trace.setter, null);
  assert.equal(app.pendingSelection.diagnostics().listeners, 0,
    "pending Store lease survived root disposal");
  assert.equal(app.pendingSelection.diagnostics().roots, 0,
    "pending Store retained disposed root");
  assert.equal(app.acceptedSelection.diagnostics().roots, 0,
    "previously accepted Store retained disposed root");
  assert.equal(app.gateStore.diagnostics().roots, 0,
    "gate Store retained disposed root");
} catch (error) {
  primaryError = error;
}

const cleanupErrors = [];
try { root?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
if (primaryError && cleanupErrors.length > 0) {
  throw new AggregateError([primaryError, ...cleanupErrors],
    "Compiled direct-intent fixture and cleanup both failed",
    { cause: primaryError });
}
if (primaryError) throw primaryError;
if (cleanupErrors.length > 0) {
  throw new AggregateError(cleanupErrors,
    "Compiled direct-intent cleanup failed");
}
console.log("PASS compiled direct intent: actual Rust/OXC tree updates retain latest blocked props and newly observed Store, reject older settlement, preserve local state, and dispose cleanly. This fixture exercises root.update, not React DOM.");
console.log(`Evidence artifacts: ${artifactDirectory}`);
