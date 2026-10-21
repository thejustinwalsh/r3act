import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { transformWithOxc } from "vite";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { compiledNumericDescriptors } from "./compiled_numeric_descriptor_test_helpers.mjs";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

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
export const trace = {
  controls: Object.create(null),
  activations: Object.create(null),
  cleanups: Object.create(null),
};
export function A() {
  const selected = use(mode) === 0 ? firstA.promise : nextA.promise;
  const value = use(selected);
  return <div key="a-host" data-a="primary">{value}</div>;
}
export function B(props) {
  const id = props.id;
  const [level, setLevel] = useState(1);
  useEffect(() => {
    trace.controls[id] = setLevel;
    trace.activations[id] = (trace.activations[id] || 0) + 1;
    return () => {
      trace.cleanups[id] = (trace.cleanups[id] || 0) + 1;
      if (trace.controls[id] === setLevel) delete trace.controls[id];
    };
  });
  return <output key="b-host" data-root={id} data-level={level}
    style={{ opacity: level / 10 }} />;
}
export function App(props) {
  return <section>
    <Suspense fallback={<div key="a-host">a-loading</div>}>
      <A key="a-child" />
    </Suspense>
    <B key="b-child" id={props.id} />
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
const outputFor = (container, id) => locate(container, (node) =>
  node.tag === "output" && node.props["data-root"] === id);

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
let primaryError;
let artifactDirectory;
try {
  const cacheDirectory = path.join(projectRoot, ".cache");
  await mkdir(cacheDirectory, { recursive: true });
  artifactDirectory = path.join(cacheDirectory,
    `compiled-urgent-retained-${randomUUID()}`);
  await mkdir(artifactDirectory, { recursive: false });
  const sourcePath = path.join(artifactDirectory, "urgent.tsx");
  const transformedPath = path.join(artifactDirectory, "urgent.transformed.tsx");
  const outputPath = path.join(artifactDirectory, "urgent.mjs");
  await writeFile(sourcePath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, sourcePath);
  assert.ok(transformed?.code, "authored urgent TSX did not compile through Rust/OXC");
  await writeFile(transformedPath, transformed.code, { flag: "wx" });

  const ast = parse(transformed.code, {
    sourceType: "module", plugins: ["typescript", "jsx"],
  });
  const registrations = registrationsFor(ast, "#component:B");
  assert.equal(registrations.length, 1,
    "B needs exactly one actual defineComponent registration");
  assert.equal(registrations[0].arguments[1]?.name, "B",
    "numeric metadata belongs to the authored B component");
  const metadata = registrations[0].arguments[2];
  const layout = property(metadata, "stateLayout");
  assert.equal(layout?.type, "ObjectExpression", "B has no compiled state layout");
  assert.match(stringValue(property(layout, "programId")) ?? "", /#component:B$/);
  assert.ok(stringValue(property(layout, "moduleRevision")),
    "B layout has no emitted module revision");
  const slots = property(layout, "slots");
  assert.equal(slots?.type, "ArrayExpression");
  assert.equal(slots.elements.length, 1, "B should have one numeric state slot");
  const stateSite = stringValue(property(slots.elements[0], "siteId"));
  assert.match(stateSite ?? "", /#component:B#state:0$/);
  const propOnlySites = property(metadata, "propOnlySites");
  assert.equal(propOnlySites?.type, "ArrayExpression");
  assert.deepEqual(propOnlySites.elements.map(stringValue), [stateSite],
    "B state must be compiler approved for prop-only admission");
  assert.ok(property(metadata, "ownerUpdateProgram"),
    "B lacks an owner update program");
  const descriptors = compiledNumericDescriptors(transformed.code)
    .filter((entry) => entry.ownerProgramId?.endsWith("#component:B"));
  assert.equal(descriptors.length, 2,
    "B needs closed data-level and style.opacity scalar sinks");
  assert.ok(descriptors.every((entry) =>
    entry.sourceSites?.length === 1 && entry.sourceSites[0] === stateSite &&
    entry.closedExpressionKinds.length > 0),
  "both B sinks must read the exact state site through closed programs");
  assert.ok(descriptors.some((entry) =>
    entry.closedExpressionKinds.includes("binary")),
  "authored opacity arithmetic lacks a closed expression");
  await writeFile(path.join(artifactDirectory, "numeric-programs.json"),
    JSON.stringify({ stateSite, descriptors }, null, 2) + "\n", { flag: "wx" });

  const emitted = await transformWithOxc(transformed.code, sourcePath, {
    lang: "tsx",
    jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" },
  });
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  const app = await import(pathToFileURL(outputPath).href);
  app.firstA.resolve("old-a");
  await Promise.resolve();

  const makeRoot = (id) => {
    const host = new MemoryVDOMHost();
    const container = host.createContainer();
    const root = createNativeRoot(host, container, {
      rootId: `compiled-urgent-retained-${id}`, scheduleCommit() {},
    });
    roots.push(root);
    root.mount(jsx(app.App, { id }));
    return { root, container };
  };
  const first = makeRoot("first");
  const second = makeRoot("second");
  await settleFlush(first.root);
  await settleFlush(second.root);
  for (const [id, { container }] of [["first", first], ["second", second]]) {
    assert.equal(treeText(container), "old-a", "initial A output is not accepted");
    const b = outputFor(container, id);
    assert.ok(b, `${id} B host is missing`);
    assert.equal(b.props["data-level"], 1);
    assert.equal(b.props.style.opacity, 0.1);
    assert.equal(app.trace.activations[id], 1,
      `${id} setter was not installed by committed effect activation`);
  }
  const firstAHost = locate(first.container, (node) =>
    node.props["data-a"] === "primary");
  const secondAHost = locate(second.container, (node) =>
    node.props["data-a"] === "primary");
  const firstBHost = outputFor(first.container, "first");
  const secondBHost = outputFor(second.container, "second");
  assert.ok(firstAHost && secondAHost && firstBHost && secondBHost);
  assert.notStrictEqual(firstBHost, secondBHost,
    "separate roots shared a B host object");
  const firstSetter = app.trace.controls.first;
  const secondSetter = app.trace.controls.second;
  assert.equal(typeof firstSetter, "function");
  assert.equal(typeof secondSetter, "function");

  app.mode.dispatch(1);
  first.root.flush();
  second.root.flush();
  assert.equal(treeText(first.container), "old-a");
  assert.equal(treeText(second.container), "old-a");
  assert.strictEqual(app.trace.controls.first, firstSetter,
    "blocked speculative render replaced first root's committed setter");
  assert.strictEqual(app.trace.controls.second, secondSetter,
    "blocked speculative render replaced second root's committed setter");

  assert.equal(firstSetter(2), true, "first root numeric setter was rejected");
  assert.equal(first.root.flush(), true,
    "ordinary flush did not accept closed B props beside pending A");
  assert.strictEqual(outputFor(first.container, "first"), firstBHost,
    "urgent B update replaced its host");
  assert.deepEqual(
    [firstBHost.props["data-level"], firstBHost.props.style.opacity],
    [2, 0.2], "ordinary flush did not apply both closed scalar props",
  );
  assert.strictEqual(locate(first.container, (node) =>
    node.props["data-a"] === "primary"), firstAHost,
  "urgent B update replaced retained A host");
  assert.equal(treeText(first.container), "old-a",
    "urgent B update advanced pending A output");
  assert.strictEqual(outputFor(second.container, "second"), secondBHost);
  assert.equal(secondBHost.props["data-level"], 1,
    "first root consumed second root's accepted state");

  assert.equal(secondSetter(3), true);
  assert.equal(second.root.flush(), true,
    "second root did not independently accept its closed numeric cut");
  assert.strictEqual(outputFor(second.container, "second"), secondBHost);
  assert.deepEqual(
    [secondBHost.props["data-level"], secondBHost.props.style.opacity],
    [3, 0.3],
  );
  assert.strictEqual(locate(second.container, (node) =>
    node.props["data-a"] === "primary"), secondAHost);
  assert.equal(treeText(second.container), "old-a");

  app.nextA.resolve("new-a");
  await settleFlush(first.root);
  assert.equal(treeText(first.container), "new-a");
  assert.strictEqual(outputFor(first.container, "first"), firstBHost,
    "later A retry regressed first B host identity");
  assert.deepEqual(
    [firstBHost.props["data-level"], firstBHost.props.style.opacity],
    [2, 0.2], "later A retry regressed first B's accepted props",
  );
  assert.equal(treeText(second.container), "old-a",
    "first A retry consumed second root's pending view");
  await settleFlush(second.root);
  assert.equal(treeText(second.container), "new-a");
  assert.strictEqual(outputFor(second.container, "second"), secondBHost);
  assert.deepEqual(
    [secondBHost.props["data-level"], secondBHost.props.style.opacity],
    [3, 0.3],
  );

  for (const [id, { root, container }] of [["first", first], ["second", second]]) {
    root.dispose();
    assert.equal(container.children.length, 0, `${id} host children leaked`);
    assert.equal(root.diagnostics().ownerCount, 0, `${id} owners leaked`);
    assert.equal(root.diagnostics().disposed, true);
    assert.equal(app.trace.activations[id], app.trace.cleanups[id],
      `${id} committed B effect did not clean up`);
    assert.equal(app.trace.controls[id], undefined,
      `${id} committed setter remained exposed after disposal`);
  }
} catch (error) {
  primaryError = error;
}

const cleanupErrors = [];
for (const root of roots) {
  try { root.dispose(); } catch (error) { cleanupErrors.push(error); }
}
try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
if (primaryError && cleanupErrors.length > 0) {
  throw new AggregateError([primaryError, ...cleanupErrors],
    "Compiled urgent retained fixture and cleanup both failed",
    { cause: primaryError });
}
if (primaryError) throw primaryError;
if (cleanupErrors.length > 0) {
  throw new AggregateError(cleanupErrors,
    "Compiled urgent retained cleanup failed");
}
console.log("PASS compiled urgent retained: Rust/OXC DOM props publish during pending Store/resource work, roots stay independent, later A retry preserves B, and disposal cleans up.");
console.log(`Evidence artifacts: ${artifactDirectory}`);
