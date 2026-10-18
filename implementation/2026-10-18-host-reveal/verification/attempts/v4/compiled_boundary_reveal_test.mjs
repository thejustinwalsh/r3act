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
export const resourceB = new AsyncResource(pendingB.promise);
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

export function App() {
  return <section>
    <Suspense fallback={<div key="a-host">a-loading</div>}>
      <A key="a-child" />
    </Suspense>
    <Suspense fallback={<div key="b-host">b-loading</div>}>
      <B key="b-child" resource={resourceB} />
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
    `compiled-boundary-reveal-${randomUUID()}`,
  );
  await mkdir(artifactDirectory, { recursive: false });
  const sourcePath = path.join(artifactDirectory, "boundary.tsx");
  const transformedPath = path.join(artifactDirectory, "boundary.transformed.tsx");
  const outputPath = path.join(artifactDirectory, "boundary.mjs");
  await writeFile(sourcePath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, sourcePath);
  assert.ok(transformed?.code, "authored boundary TSX did not compile through Rust/OXC");
  await writeFile(transformedPath, transformed.code, { flag: "wx" });
  const ast = parse(transformed.code, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });
  const registrations = findClosedProgramRegistrations(ast, "#component:B");
  assert.equal(registrations.length, 1,
    "B must have exactly one actual defineComponent registration with a closed program");
  assert.equal(registrations[0].component, "B",
    "closed resource program must belong to B's runtime registration");
  const program = registrations[0].program;
  const host = getProperty(program, "host");
  const props = getProperty(host, "props");
  assert.equal(literalValue(getProperty(program, "schemaVersion")), 1);
  assert.match(stringValue(getProperty(program, "componentProgramId")) ?? "",
    /#component:B$/);
  assert.ok(stringValue(getProperty(program, "moduleRevision")),
    "closed program must carry a module revision");
  assert.ok(stringValue(getProperty(program, "resourceUseSiteId")),
    "closed program must carry its resource use site");
  assert.equal(stringValue(getProperty(program, "resourceProp")), "resource");
  assert.equal(stringValue(getProperty(host, "tag")), "div");
  assert.equal(stringValue(getProperty(host, "key")), "b-host");
  assert.equal(stringValue(getProperty(host, "child")), "resource-value");
  assert.equal(props?.type, "ArrayExpression");
  assert.deepEqual(props.elements.map((entry) => [
    stringValue(entry.elements[0]), stringValue(entry.elements[1]),
  ]), [["data-b", "primary"]]);
  await writeFile(path.join(artifactDirectory, "closed-resource-program.json"), JSON.stringify({
    componentProgramId: stringValue(getProperty(program, "componentProgramId")),
    moduleRevision: stringValue(getProperty(program, "moduleRevision")),
    resourceUseSiteId: stringValue(getProperty(program, "resourceUseSiteId")),
    resourceProp: stringValue(getProperty(program, "resourceProp")),
    host: {
      tag: stringValue(getProperty(host, "tag")),
      key: stringValue(getProperty(host, "key")),
      props: props.elements.map((entry) => [
        stringValue(entry.elements[0]), stringValue(entry.elements[1]),
      ]),
      child: stringValue(getProperty(host, "child")),
    },
  }, null, 2) + "\n", { flag: "wx" });

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

  const hostAdapter = new MemoryVDOMHost();
  const container = hostAdapter.createContainer();
  const root = createNativeRoot(hostAdapter, container, {
    rootId: "compiled-boundary-reveal",
    scheduleCommit() {},
  });
  roots.push(root);
  root.mount(jsx(app.App, {}));
  await settleFlush(root);
  assert.equal(treeText(container), "old-ab-loading",
    "initial accepted view should show A primary and B fallback");
  const section = container.children[0];
  const acceptedA = locate(section, (node) => node.props["data-a"] === "primary");
  assert.ok(acceptedA, "A primary host element is missing");

  app.mode.dispatch(1);
  root.flush();
  assert.equal(treeText(container), "old-ab-loading",
    "A's pending Store-selected resource should retain its accepted primary");
  assert.strictEqual(
    locate(container, (node) => node.props["data-a"] === "primary"), acceptedA,
    "A's accepted primary identity changed while its new resource was pending",
  );

  app.pendingB.resolve("ready-b");
  await settleFlush(root);
  assert.equal(treeText(container), "old-aready-b",
    "B should reveal while A's selected resource remains pending");
  assert.strictEqual(
    locate(container, (node) => node.props["data-a"] === "primary"), acceptedA,
    "revealing B replaced A's retained host identity",
  );
  assert.ok(locate(container, (node) => node.props["data-b"] === "primary"),
    "compiled closed program did not publish B's primary host");

  app.nextA.resolve("new-a");
  await settleFlush(root);
  assert.equal(treeText(container), "new-aready-b",
    "A's later ordinary resource retry should publish without regressing B");
  assert.strictEqual(
    locate(container, (node) => node.props["data-b"] === "primary")?.props.key,
    "b-host",
  );
  root.dispose();
  assert.equal(container.children.length, 0,
    "disposing the root should remove all host children");
  assert.equal(root.diagnostics().ownerCount, 0,
    "disposing the root should revoke all live owners");
  assert.equal(root.diagnostics().disposed, true,
    "root disposal should reach its terminal state");
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
    "Compiled boundary reveal fixture and cleanup both failed",
    { cause: primaryError },
  );
}
if (primaryError) throw primaryError;
if (cleanupErrors.length > 0) {
  throw new AggregateError(cleanupErrors, "Compiled boundary reveal cleanup failed");
}
console.log(
  "PASS compiled boundary reveal: Rust/OXC closed resource-host metadata, accepted B fallback, retained Store-pending A identity, B settlement reveal, later A retry, and disposal.",
);
console.log(`Evidence artifacts: ${artifactDirectory}`);
