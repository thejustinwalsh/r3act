import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { transformWithOxc } from "vite";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { createNativeRoot, createWorld, jsx } from "../src/native_runtime_api.ts";
import { NativeRootWorkQueue } from "../src/native_root_work_queue.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const compilerBinary = path.join(projectRoot, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const directory = path.join(projectRoot, ".cache", `compiled-publication-callbacks-${randomUUID()}`);
const runtimeUrl = pathToFileURL(path.join(projectRoot, "src/native_runtime_api.ts")).href;
const source = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { AsyncResource, Suspense, createStore, jsx, use } from ${JSON.stringify(runtimeUrl)};
export function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
export const pendingA = deferred(), pendingB = deferred(), pendingC = deferred();
export const resourceA = new AsyncResource(pendingA.promise);
export const resourceB = new AsyncResource(pendingB.promise);
export const resourceC = new AsyncResource(pendingC.promise);
export const newer = createStore(0, (_old, action) => action);
export function A(props) { const value = use(props.resource); return <div key="a-host" data-a="ready">{value}</div>; }
export function BInner(props) { const value = use(props.resource); return <div key="b-host" data-b="ready">{value}</div>; }
export function BOuter(props) { return <BInner key="b-inner" resource={props.resource} />; }
export function AppA() { return <Suspense fallback={<div key="a-host" data-a="fallback">A waiting</div>}><A key="a-owner" resource={resourceA} /></Suspense>; }
export function AppB(props) { return <Suspense fallback={<div key="b-host" data-b="fallback">B waiting</div>}>{props.child}</Suspense>; }
`;
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const expectBaselineBug = process.argv.includes("--expect-baseline-bug");
const property = (node, name) => node?.type === "ObjectExpression" ?
  node.properties.find((entry) => entry.type === "ObjectProperty" && !entry.computed &&
    (entry.key.name ?? entry.key.value) === name)?.value : null;
const literal = (node) => ["StringLiteral", "NumericLiteral"].includes(node?.type) ? node.value : null;
const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [key, child] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
    if (Array.isArray(child)) child.forEach((entry) => visit(entry, callback));
    else if (child && typeof child === "object") visit(child, callback);
  }
};
const locate = (node, predicate) => predicate(node) ? node :
  (node.children ?? []).map((child) => locate(child, predicate)).find(Boolean);
const treeText = (node) => (node.text ?? "") + (node.children ?? []).map(treeText).join("");
const waitScheduled = async () => {
  for (let index = 0; index < 5; index++) await new Promise((done) => setTimeout(done, 0));
};

const plugin = nativeModuleCompilerPlugin({ root: projectRoot, compilerBinary });
const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
const roots = [];
const containers = [];
let queue, primaryError, result;
try {
  await mkdir(directory, { recursive: true });
  const sourcePath = path.join(directory, "publication-callbacks.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  const compilerSha256 = sha(await readFile(compilerBinary));
  const transformed = await plugin.transform.call(context, source, sourcePath);
  assert.ok(transformed?.code, "actual Rust/OXC transform missing");
  await writeFile(path.join(directory, "publication-callbacks.transformed.tsx"),
    transformed.code, { flag: "wx" });
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const definitions = new Map();
  visit(ast, (node) => {
    if (node.type !== "CallExpression" || node.callee.type !== "Identifier") return;
    const id = literal(node.arguments[0]);
    if (typeof id !== "string" || !id.includes("#component:")) return;
    definitions.set(id.slice(id.lastIndexOf("#component:") + 11), node);
  });
  const outer = definitions.get("BOuter"), inner = definitions.get("BInner");
  assert.ok(outer && inner, "actual compiled B forwarding/leaf registrations missing");
  const forwarding = property(outer.arguments[2], "closedComponentForwardProgram");
  const resource = property(inner.arguments[2], "closedResourceHostProgram");
  assert.equal(literal(property(forwarding, "childComponentProgramId")),
    literal(inner.arguments[0]), "BOuter must compile to forwarding");
  assert.equal(literal(property(resource, "componentProgramId")),
    literal(inner.arguments[0]), "BInner must compile to a closed resource host");
  assert.equal(literal(property(resource, "resourceProp")), "resource");
  assert.equal(literal(property(property(resource, "host"), "key")), "b-host");
  const emitted = await transformWithOxc(transformed.code, sourcePath, {
    lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" },
  });
  const outputPath = path.join(directory, "publication-callbacks.mjs");
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  await writeFile(path.join(directory, "provenance.json"), JSON.stringify({
    compilerSha256, sourceSha256: sha(source), transformedSha256: sha(transformed.code),
    emittedSha256: sha(emitted.code), forwardingId: literal(outer.arguments[0]),
    resourceId: literal(inner.arguments[0]),
  }, null, 2) + "\n", { flag: "wx" });
  const capturedCompilerSha256 = process.env.R3ACT_CAPTURED_COMPILER_SHA256;
  if (capturedCompilerSha256) assert.equal(compilerSha256, capturedCompilerSha256,
    "fixture did not execute the captured compiler binary");
  const app = await import(pathToFileURL(outputPath).href);
  const world = createWorld();
  const makeRoot = (name) => {
    const host = new MemoryVDOMHost(), container = host.createContainer();
    const root = createNativeRoot(host, container, { world,
      rootId: `publication-callback-${name}-${randomUUID()}`, scheduleCommit() {} });
    roots.push(root);
    containers.push(container);
    return { root, container };
  };
  const a = makeRoot("a"), b = makeRoot("b");
  const original = new Error("late-B-proxy-descriptor-after-A-acceptance");
  const target = Object.freeze({ key: "b-outer", resource: app.resourceB });
  let armed = false, descriptorReads = 0, lateReads = 0, propertyGets = 0;
  let aBefore;
  const props = new Proxy(target, {
    get(object, key, receiver) {
      propertyGets++;
      return Reflect.get(object, key, receiver);
    },
    getOwnPropertyDescriptor(object, key) {
      descriptorReads++;
      if (armed && a.root.publicationVersion !== aBefore) {
        lateReads++;
        app.newer.dispatch(7);
        throw original;
      }
      return Reflect.getOwnPropertyDescriptor(object, key);
    },
  });
  const child = Object.freeze({ type: app.BOuter, props });
  assert.equal(Object.isFrozen(props), true, "structural props must be frozen for optimized reveal");
  a.root.mount(jsx(app.AppA, {}));
  b.root.mount(jsx(app.AppB, { child }));
  assert.equal(treeText(a.container), "A waiting");
  assert.equal(treeText(b.container), "B waiting");
  const fallbackA = locate(a.container, (node) => node.props?.["data-a"] === "fallback");
  const fallbackB = locate(b.container, (node) => node.props?.["data-b"] === "fallback");
  assert.ok(fallbackA && fallbackB);
  const propertyGetsBefore = propertyGets;
  aBefore = a.root.publicationVersion;
  const bBefore = b.root.publicationVersion;
  const bAccepted = JSON.stringify(b.root.snapshot);
  assert.match(bAccepted, /B waiting/, "baseline B snapshot lacks accepted fallback");
  queue = new NativeRootWorkQueue();
  const work = queue.enqueueResources({ id: `publication-callbacks-${randomUUID()}`,
    roots: [
      { root: a.root, resources: [app.resourceA] },
      { root: b.root, resources: [app.resourceB] },
    ],
  });
  assert.equal(work.status, "pending");
  armed = true;
  app.pendingA.resolve("ready-a");
  app.pendingB.resolve("ready-b");
  await waitScheduled();
  assert.ok(descriptorReads > 0, "B frozen Proxy was never inspected");
  if (expectBaselineBug) {
    assert.ok(lateReads > 0, "baseline did not reach optimized late descriptor validation");
    assert.equal(work.status, "failed");
    assert.strictEqual(work.resolution.error, original, "baseline lost the exact caller error");
    assert.equal(a.root.publicationVersion, aBefore + 1,
      "baseline did not expose the partial accepted A frontier");
    assert.equal(b.root.publicationVersion, bBefore);
    assert.equal(JSON.stringify(b.root.snapshot), bAccepted,
      "baseline B accepted snapshot advanced after its failed publication");
    assert.equal(app.newer.getState(), 7, "newer callback action was consumed");
    assert.equal(propertyGets, propertyGetsBefore,
      "baseline unexpectedly declined optimized reveal");
  } else {
    assert.equal(work.status, "committed", "corrected group did not accept both roots");
    assert.equal(lateReads, 0, "B reread caller descriptors after A accepted");
    assert.deepEqual([a.root.publicationVersion, b.root.publicationVersion],
      [aBefore + 1, bBefore + 1], "group frontier did not advance together");
    assert.equal(treeText(a.container), "ready-a");
    assert.equal(treeText(b.container), "ready-b");
    assert.equal(app.newer.getState(), 0);
    assert.ok(propertyGets > propertyGetsBefore,
      "unowned frozen Proxy did not take the generic fallback");
  }
  armed = false;
  if (!expectBaselineBug) {
    const c = makeRoot("factory");
    const conformingChild = jsx(app.BOuter, { key: "b-outer", resource: app.resourceC });
    c.root.mount(jsx(app.AppB, { child: conformingChild }));
    assert.equal(treeText(c.container), "B waiting");
    const cBefore = c.root.publicationVersion;
    const conforming = queue.enqueueResources({ id: `publication-factory-${randomUUID()}`,
      roots: [{ root: c.root, resources: [app.resourceC] }] });
    assert.equal(conforming.status, "pending");
    app.pendingC.resolve("ready-c");
    await waitScheduled();
    assert.equal(conforming.status, "committed");
    assert.equal(c.root.publicationVersion, cBefore + 1);
    assert.equal(treeText(c.container), "ready-c");
  }
  if (capturedCompilerSha256) assert.equal(sha(await readFile(compilerBinary)), capturedCompilerSha256,
    "captured compiler binary changed during execution");
  result = { status: "PASS",
    mode: expectBaselineBug ? "baseline-reproduction" : "corrected",
    sharedWorld: true, descriptorReads, lateReads, originalError: original.message,
    versionsBefore: [aBefore, bBefore],
    versionsAfter: [a.root.publicationVersion, b.root.publicationVersion],
    physicalBTextAfterGroup: treeText(b.container),
    bAcceptedSnapshotUnchanged: expectBaselineBug
      ? JSON.stringify(b.root.snapshot) === bAccepted : null,
    propertyGets,
    newerAction: app.newer.getState(),
  };
} catch (error) { primaryError = error; }
const cleanupErrors = [];
const cleanup = [];
try { queue?.dispose(); } catch (error) { cleanupErrors.push(error); }
for (let index = 0; index < roots.length; index++) {
  const root = roots[index];
  try {
    root.dispose();
    assert.equal(root.diagnostics().ownerCount, 0);
    assert.equal(root.diagnostics().pendingChangeCount, 0);
    assert.equal(root.diagnostics().disposed, true);
    assert.equal(containers[index].children.length, 0);
    cleanup.push({ rootId: root.rootId, ownerCount: 0, pendingChangeCount: 0,
      disposed: true, hostChildren: 0 });
  }
  catch (error) { cleanupErrors.push(error); }
}
try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
if (primaryError || cleanupErrors.length) {
  try { await writeFile(path.join(directory, "failure.json"), JSON.stringify({
    status: "FAIL", primaryError: primaryError ? String(primaryError.stack ?? primaryError) : null,
    cleanupErrors: cleanupErrors.map((error) => String(error.stack ?? error)),
  }, null, 2) + "\n", { flag: "wx" }); } catch (error) { cleanupErrors.push(error); }
}
if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors],
  "compiled publication callback fixture and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "compiled publication callback cleanup failed");
await writeFile(path.join(directory, "result.json"), JSON.stringify({ ...result, cleanup }, null, 2) + "\n",
  { flag: "wx" });
console.log(`PASS compiled publication callback regression; evidence: ${directory}`);
