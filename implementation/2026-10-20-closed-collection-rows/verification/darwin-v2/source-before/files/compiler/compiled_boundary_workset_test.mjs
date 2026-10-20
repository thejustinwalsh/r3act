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
const runtimeUrl = pathToFileURL(
  path.join(projectRoot, "src/native_runtime_api.ts"),
).href;
const authored = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, Suspense, use, createStore, jsx } from ${JSON.stringify(runtimeUrl)};

export function deferred() {
  let resolve;
  const promise = new Promise((yes) => { resolve = yes; });
  return { promise, resolve };
}

export const firstA = deferred();
export const nextA = deferred();
export const pendingB = deferred();
export const pendingC = deferred();
export const resourceB = new AsyncResource(pendingB.promise);
export const resourceC = new AsyncResource(pendingC.promise);
export const mode = createStore(0, (_state, action) => action);

export function A() {
  const selected = use(mode) === 0 ? firstA.promise : nextA.promise;
  const value = use(selected);
  return <div key="a-host" data-a="primary">{value}</div>;
}

export function B(props) {
  const value = use(props.resource);
  return <div key="b-host" data-b="primary">{value}</div>;
}

export function C(props) {
  const value = use(props.resource);
  return <div key="c-host" data-c="primary">{value}</div>;
}

export function App() {
  return <section>
    <Suspense fallback={<div key="a-host">a-loading</div>}>
      <A key="a-child" />
    </Suspense>
    <Suspense fallback={<div key="b-host">b-loading</div>}>
      <B key="b-child" resource={resourceB} />
    </Suspense>
    <Suspense fallback={<div key="c-host">c-loading</div>}>
      <C key="c-child" resource={resourceC} />
    </Suspense>
  </section>;
}
`;

const getProperty = (node, name) => node?.properties?.find((entry) =>
  entry.type === "ObjectProperty" && !entry.computed &&
  (entry.key.name ?? entry.key.value) === name
)?.value;
const stringValue = (node) => node?.type === "StringLiteral"
  ? node.value
  : null;
const literalValue = (node) => {
  if (node?.type === "StringLiteral") return node.value;
  if (node?.type === "BooleanLiteral" || node?.type === "NumericLiteral") {
    return node.value;
  }
  return null;
};
const findClosedProgramRegistrations = (ast, componentSuffix) => {
  const defineComponentLocals = new Set();
  for (const statement of ast.program.body) {
    if (statement.type !== "ImportDeclaration" ||
      !String(statement.source.value).includes("native_runtime_api")) continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type !== "ImportSpecifier") continue;
      const imported = specifier.imported.name ?? specifier.imported.value;
      if (imported === "defineComponent") defineComponentLocals.add(specifier.local.name);
    }
  }
  const found = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "CallExpression" && node.callee.type === "Identifier" &&
      defineComponentLocals.has(node.callee.name)) {
      const id = stringValue(node.arguments[0]);
      const component = node.arguments[1];
      const metadata = node.arguments[2];
      if (typeof id === "string" && id.endsWith(componentSuffix) &&
        component?.type === "Identifier" && metadata?.type === "ObjectExpression") {
        const program = getProperty(metadata, "closedResourceHostProgram");
        if (program) found.push({ id, component: component.name, program });
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === "loc" || key === "start" || key === "end") continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  };
  visit(ast);
  return found;
};
const treeText = (node) =>
  (node.text ?? "") + node.children.map(treeText).join("");
const locate = (node, predicate) =>
  predicate(node) ? node : node.children.map((child) =>
    locate(child, predicate)
  ).find(Boolean);
const settleFlush = async (root) => {
  for (let index = 0; index < 5; index++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  root.flush();
};

const plugin = nativeModuleCompilerPlugin({
  root: projectRoot,
  compilerBinary: path.join(
    projectRoot,
    "compiler/oxc-spike/target/debug/ui-graph-compiler-spike",
  ),
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
  artifactDirectory = path.join(
    cacheDirectory,
    `compiled-boundary-workset-${randomUUID()}`,
  );
  await mkdir(artifactDirectory, { recursive: false });
  const sourcePath = path.join(artifactDirectory, "workset.tsx");
  const transformedPath = path.join(artifactDirectory, "workset.transformed.tsx");
  const outputPath = path.join(artifactDirectory, "workset.mjs");
  await writeFile(sourcePath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, sourcePath);
  assert.ok(transformed?.code, "authored workset TSX did not compile through Rust/OXC");
  await writeFile(transformedPath, transformed.code, { flag: "wx" });
  const ast = parse(transformed.code, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });
  const proofs = [];
  for (const [component, hostKey, dataName, dataValue] of [
    ["B", "b-host", "data-b", "primary"],
    ["C", "c-host", "data-c", "primary"],
  ]) {
    const registrations = findClosedProgramRegistrations(ast, `#component:${component}`);
    assert.equal(registrations.length, 1,
      `${component} must have exactly one actual defineComponent closed registration`);
    assert.equal(registrations[0].component, component,
      `${component} closed program belongs to the wrong runtime registration`);
    const program = registrations[0].program;
    const host = getProperty(program, "host");
    const props = getProperty(host, "props");
    assert.equal(literalValue(getProperty(program, "schemaVersion")), 1);
    assert.match(stringValue(getProperty(program, "componentProgramId")) ?? "",
      new RegExp(`#component:${component}$`));
    assert.ok(stringValue(getProperty(program, "moduleRevision")),
      `${component} closed program lacks module revision`);
    assert.ok(stringValue(getProperty(program, "resourceUseSiteId")),
      `${component} closed program lacks resource use site`);
    assert.equal(stringValue(getProperty(program, "resourceProp")), "resource");
    assert.equal(stringValue(getProperty(host, "tag")), "div");
    assert.equal(stringValue(getProperty(host, "key")), hostKey);
    assert.equal(stringValue(getProperty(host, "child")), "resource-value");
    assert.equal(props?.type, "ArrayExpression");
    assert.deepEqual(props.elements.map((entry) => [
      stringValue(entry.elements[0]), stringValue(entry.elements[1]),
    ]), [[dataName, dataValue]]);
    proofs.push({
      component,
      componentProgramId: stringValue(getProperty(program, "componentProgramId")),
      moduleRevision: stringValue(getProperty(program, "moduleRevision")),
      resourceUseSiteId: stringValue(getProperty(program, "resourceUseSiteId")),
      resourceProp: stringValue(getProperty(program, "resourceProp")),
      host: { tag: "div", key: hostKey, props: [[dataName, dataValue]], child: "resource-value" },
    });
  }
  assert.equal(proofs[0].moduleRevision, proofs[1].moduleRevision,
    "closed children must share the emitted module revision");
  await writeFile(path.join(artifactDirectory, "closed-resource-programs.json"),
    JSON.stringify(proofs, null, 2) + "\n", { flag: "wx" });

  const emitted = await transformWithOxc(
    transformed.code,
    sourcePath,
    {
      lang: "tsx",
      jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" },
    },
  );
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  const app = await import(pathToFileURL(outputPath).href);
  app.firstA.resolve("old-a");
  await Promise.resolve();

  const makeRoot = (id) => {
    const hostAdapter = new MemoryVDOMHost();
    const container = hostAdapter.createContainer();
    const root = createNativeRoot(hostAdapter, container, {
      rootId: `compiled-boundary-workset-${id}`,
      scheduleCommit() {},
    });
    roots.push(root);
    root.mount(jsx(app.App, {}));
    return { root, container };
  };
  const first = makeRoot("first");
  const second = makeRoot("second");
  await settleFlush(first.root);
  await settleFlush(second.root);
  for (const { container } of [first, second]) {
    assert.equal(treeText(container), "old-ab-loadingc-loading",
      "each root must accept A primary with B/C initial fallbacks");
  }
  const firstAHost = locate(first.container, (node) => node.props["data-a"] === "primary");
  const secondAHost = locate(second.container, (node) => node.props["data-a"] === "primary");
  assert.ok(firstAHost && secondAHost && firstAHost !== secondAHost,
    "roots need separate accepted A host identities");

  app.mode.dispatch(1);
  first.root.flush();
  second.root.flush();
  for (const { container } of [first, second]) {
    assert.equal(treeText(container), "old-ab-loadingc-loading",
      "Store-selected pending A must retain the accepted view");
  }

  app.pendingB.resolve("ready-b");
  app.pendingC.resolve("ready-c");
  await settleFlush(first.root);
  assert.equal(treeText(first.container), "old-aready-bready-c",
    "one root flush must drain both ready boundaries while A is pending");
  assert.strictEqual(
    locate(first.container, (node) => node.props["data-a"] === "primary"),
    firstAHost,
    "B/C workset changed first root's retained A host",
  );
  assert.equal(treeText(second.container), "old-ab-loadingc-loading",
    "first root's workset consumed the second root's accepted history");
  assert.strictEqual(
    locate(second.container, (node) => node.props["data-a"] === "primary"),
    secondAHost,
    "first root's workset changed the second root's retained A host",
  );
  const firstBHost = locate(first.container, (node) => node.props["data-b"] === "primary");
  const firstCHost = locate(first.container, (node) => node.props["data-c"] === "primary");
  assert.ok(firstBHost && firstCHost, "first root did not publish both closed children");

  await settleFlush(second.root);
  assert.equal(treeText(second.container), "old-aready-bready-c",
    "second root must independently drain its ready boundary workset");
  assert.strictEqual(
    locate(second.container, (node) => node.props["data-a"] === "primary"),
    secondAHost,
    "second root's workset changed its retained A host",
  );
  const secondBHost = locate(second.container, (node) => node.props["data-b"] === "primary");
  const secondCHost = locate(second.container, (node) => node.props["data-c"] === "primary");
  assert.ok(secondBHost && secondCHost, "second root did not publish both closed children");
  assert.notStrictEqual(firstBHost, secondBHost, "roots shared B host identity");
  assert.notStrictEqual(firstCHost, secondCHost, "roots shared C host identity");

  app.nextA.resolve("new-a");
  await settleFlush(first.root);
  assert.equal(treeText(first.container), "new-aready-bready-c",
    "later A retry must publish without regressing B/C on first root");
  assert.strictEqual(locate(first.container, (node) => node.props["data-b"] === "primary"), firstBHost);
  assert.strictEqual(locate(first.container, (node) => node.props["data-c"] === "primary"), firstCHost);
  assert.equal(treeText(second.container), "old-aready-bready-c",
    "first root's A retry changed the second root's accepted view");
  await settleFlush(second.root);
  assert.equal(treeText(second.container), "new-aready-bready-c",
    "later A retry must publish independently on second root");
  assert.strictEqual(locate(second.container, (node) => node.props["data-b"] === "primary"), secondBHost);
  assert.strictEqual(locate(second.container, (node) => node.props["data-c"] === "primary"), secondCHost);

  for (const { root, container } of [first, second]) {
    root.dispose();
    assert.equal(container.children.length, 0,
      "disposing a root should remove all host children");
    assert.equal(root.diagnostics().ownerCount, 0,
      "disposing a root should revoke all live owners");
    assert.equal(root.diagnostics().disposed, true,
      "root disposal should reach its terminal state");
  }
} catch (error) {
  primaryError = error;
}

const cleanupErrors = [];
for (const root of roots) {
  try {
    root.dispose();
  } catch (error) {
    cleanupErrors.push(error);
  }
}
try {
  await plugin.closeBundle();
} catch (error) {
  cleanupErrors.push(error);
}
if (primaryError && cleanupErrors.length > 0) {
  throw new AggregateError(
    [primaryError, ...cleanupErrors],
    "Compiled boundary workset fixture and cleanup both failed",
    { cause: primaryError },
  );
}
if (primaryError) throw primaryError;
if (cleanupErrors.length > 0) {
  throw new AggregateError(cleanupErrors, "Compiled boundary workset cleanup failed");
}
console.log(
  "PASS compiled boundary workset: Rust/OXC B/C closed programs, two ready boundaries drained in one flush with A pending, independent shared-resource roots, retained host identities, later A retry, and disposal.",
);
console.log(`Evidence artifacts: ${artifactDirectory}`);
