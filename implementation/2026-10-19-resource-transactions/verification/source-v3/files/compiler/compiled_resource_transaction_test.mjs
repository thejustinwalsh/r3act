import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { inspect } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { transformWithOxc } from "vite";
import * as THREE from "three";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { createNativeRoot, jsx, storeRecord } from "../src/native_runtime_api.ts";
import { NativeRootWorkQueue } from "../src/native_root_work_queue.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const rootPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const compilerBinary = path.join(rootPath, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const fixturePath = path.join(rootPath, "compiler/fixtures/native-resource-transactions.tsx");
const artifact = path.join(rootPath, ".cache", `compiled-resource-transaction-${randomUUID()}`);
const runtimeUrl = pathToFileURL(path.join(rootPath, "src/native_runtime_api.ts")).href;
const authoredSource = await readFile(fixturePath, "utf8");
const source = authoredSource.replace('"@r3act/core"', JSON.stringify(runtimeUrl));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const property = (node, name) => node?.type === "ObjectExpression" ?
  node.properties.find((entry) => entry.type === "ObjectProperty" && !entry.computed &&
    (entry.key.name ?? entry.key.value) === name)?.value : null;
const literal = (node) => ["StringLiteral", "NumericLiteral"].includes(node?.type) ? node.value : null;
const visit = (node, action) => {
  if (!node || typeof node !== "object") return;
  action(node);
  for (const [key, child] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
    if (Array.isArray(child)) child.forEach((item) => visit(item, action));
    else if (child && typeof child === "object") visit(child, action);
  }
};
const find = (node, predicate) => predicate(node) ? node :
  (node.children ?? []).map((child) => find(child, predicate)).find(Boolean);
const waitScheduled = async () => {
  for (let index = 0; index < 5; index++) await new Promise((done) => setTimeout(done, 0));
};
const rows = (list) => list.children.map((node) => node.props["data-row"]);
const plugin = nativeModuleCompilerPlugin({ root: rootPath, compilerBinary });
const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
let dom, fork, three, queue, app, unsubscribeDom, unsubscribeThree, primaryError;
try {
  await mkdir(artifact, { recursive: true });
  const sourcePath = path.join(artifact, "resource-transaction.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  const compilerSha256 = sha(await readFile(compilerBinary));
  const transformed = await plugin.transform.call(context, source, sourcePath);
  assert.ok(transformed?.code, "actual Rust/OXC transform missing");
  await writeFile(path.join(artifact, "resource-transaction.transformed.tsx"), transformed.code, { flag: "wx" });
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const aliases = new Map();
  for (const statement of ast.program.body) if (statement.type === "ImportDeclaration") {
    for (const specifier of statement.specifiers) if (specifier.type === "ImportSpecifier")
      aliases.set(specifier.imported.name ?? specifier.imported.value, specifier.local.name);
  }
  const definitions = new Map();
  visit(ast, (node) => {
    if (node.type !== "CallExpression" || node.callee.name !== aliases.get("defineComponent")) return;
    const id = literal(node.arguments[0]);
    if (id) definitions.set(id.slice(id.lastIndexOf("#component:") + 11), node);
  });
  const closed = [];
  for (const name of ["ADom", "BDom", "CDom", "AThree", "BThree", "CThree"]) {
    const definition = definitions.get(name);
    assert.ok(definition, `${name} missing actual compiled registration`);
    const id = literal(definition.arguments[0]);
    const kind = name.startsWith("C") ? "closedResourceHostProgram" : "closedStoreHostProgram";
    const otherKind = kind === "closedResourceHostProgram" ? "closedStoreHostProgram" : "closedResourceHostProgram";
    const expectedSchema = kind === "closedResourceHostProgram" ? 2 : 5;
    const program = property(definition.arguments[2], kind);
    assert.equal(property(definition.arguments[2], otherKind), undefined,
      `${name} unexpectedly has both closed host program kinds`);
    assert.equal(literal(property(program, "componentProgramId")), id,
      `${name} lacks a compiler-proven closed host program`);
    assert.equal(literal(property(program, "schemaVersion")), expectedSchema,
      `${name} has the wrong closed program schema`);
    closed.push({ name, id, kind, schemaVersion: expectedSchema });
  }
  assert.match(transformed.code, /renderCollectionAt\(/);
  const emitted = await transformWithOxc(transformed.code, sourcePath, {
    lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" },
  });
  const outputPath = path.join(artifact, "resource-transaction.mjs");
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  await writeFile(path.join(artifact, "provenance.json"), JSON.stringify({
    compilerSha256, authoredSourceSha256: sha(authoredSource), sourceSha256: sha(source),
    transformedSha256: sha(transformed.code), closed,
  }, null, 2) + "\n", { flag: "wx" });
  app = await import(pathToFileURL(outputPath).href);
  const host = new MemoryVDOMHost(), container = host.createContainer();
  const domRoot = createNativeRoot(host, container, { rootId: `resource-dom-${randomUUID()}` });
  dom = { root: domRoot, container };
  domRoot.mount(jsx(app.AppDom, {}));
  const forkHost = new MemoryVDOMHost(), forkContainer = forkHost.createContainer();
  const forkRoot = createNativeRoot(forkHost, forkContainer,
    { rootId: `resource-fork-${randomUUID()}` });
  fork = { root: forkRoot, container: forkContainer };
  forkRoot.mount(jsx(app.AppResourcesDom, {}));
  const scene = new THREE.Scene();
  three = createThreeNativeRoot(scene, { namespace: THREE,
    rootOptions: { rootId: `resource-three-${randomUUID()}` } });
  three.root.mount(jsx(app.AppThree, {}));
  const section = container.children[0], group = scene.children[0];
  const fallbackA = find(section, (node) => node.props?.["data-fallback"] === "domA");
  const fallbackB = find(section, (node) => node.props?.["data-fallback"] === "domB");
  const health = find(section, (node) => node.props?.["data-health"] === "waiting");
  const local = find(section, (node) => node.tag === "button");
  const list = find(section, (node) => node.tag === "ul");
  const threeList = group.children.find((node) => node.name === "list");
  const threeA = group.children.find((node) => node.name === "threeA-waiting");
  const threeB = group.children.find((node) => node.name === "threeB-waiting");
  assert.ok(fallbackA && fallbackB && health && local && list && threeList && threeA && threeB);
  assert.deepEqual(threeList.children.map((node) => node.name), ["a", "b", "c"]);
  const originalRows = new Map(list.children.map((node) => [node.props["data-row"], node]));
  const originalThreeRows = new Map(threeList.children.map((node) => [node.name, node]));
  const domDirty = [], threeDirty = [];
  unsubscribeDom = domRoot.world.subscribeDirtyCells((handle) => domDirty.push(handle));
  unsubscribeThree = three.root.world.subscribeDirtyCells((handle) => threeDirty.push(handle));
  assert.equal(app.trace.controls.dom[0](1), true);
  assert.equal(app.trace.controls.three(1), true);
  const domCell = domDirty.find((cell) => cell.site.endsWith("#component:LocalDom#state:0"));
  const threeCell = threeDirty.find((cell) => cell.site.endsWith("#component:LocalThree#state:0"));
  assert.ok(domCell && threeCell);
  app.position.dispatch(storeRecord({ point: storeRecord({ x: 7, y: 8 }) }));
  for (const collection of [app.domRows, app.threeRows]) assert.equal(collection.apply(collection.version,
    [{ type: "move", key: "c", beforeKey: "a" }, { type: "remove", key: "b" }]).ok, true);
  const before = [domRoot.publicationVersion, three.root.publicationVersion];
  let callbacks = 0;
  queue = new NativeRootWorkQueue();
  const work = queue.enqueueTransaction({ id: `resource-transaction-${randomUUID()}`, roots: [
    { root: domRoot, cells: [domCell], collections: [app.domRows], stores: [app.position],
      resources: [app.resourceA, app.resourceB] },
    { root: three.root, cells: [threeCell], collections: [app.threeRows], stores: [app.position],
      resources: [app.resourceA, app.resourceB] },
  ], onSettled(outcome) {
    assert.equal(outcome.status, "committed");
    assert.equal(find(section, (node) => node.props?.["data-slot"] === "a")?.props["data-value"], 10);
    assert.equal(find(section, (node) => node.props?.["data-slot"] === "b")?.props["data-value"], 5);
    assert.deepEqual(group.children.find((node) => node.name === "a-ready")?.position.toArray(), [10, 4, 0]);
    assert.deepEqual(group.children.find((node) => node.name === "b-ready")?.position.toArray(), [5, 6, 0]);
    assert.deepEqual(rows(list), ["c", "a"]);
    assert.deepEqual(threeList.children.map((node) => node.name), ["c", "a"]);
    assert.strictEqual(threeList.children[0], originalThreeRows.get("c"));
    assert.strictEqual(threeList.children[1], originalThreeRows.get("a"));
    assert.equal(local.props["data-local"], 1);
    assert.equal(group.children.find((node) => node.name === "local")?.position.x, 1);
    assert.equal(app.trace.controls.dom[0](2), true);
    assert.equal(app.trace.controls.three(2), true);
    callbacks++;
  } });
  let resourceCallbacks = 0;
  const resourceOnly = queue.enqueueResources({ id: `resource-only-${randomUUID()}`,
    roots: [{ root: forkRoot, resources: [app.resourceA, app.resourceB] }],
    onSettled(outcome) {
      assert.equal(outcome.status, "committed");
      assert.equal(find(forkContainer, (node) => node.props?.["data-slot"] === "a")?.props["data-value"], 10);
      assert.equal(find(forkContainer, (node) => node.props?.["data-slot"] === "b")?.props["data-value"], 5);
      resourceCallbacks++;
    },
  });
  assert.equal(work.status, "pending");
  assert.equal(resourceOnly.status, "pending");
  assert.deepEqual([domRoot.publicationVersion, three.root.publicationVersion], before);
  app.pendingA.resolve(storeRecord({ sample: storeRecord({ x: 3, y: 4 }) }));
  await waitScheduled();
  assert.equal(work.status, "pending");
  assert.equal(resourceOnly.status, "pending");
  assert.strictEqual(find(section, (node) => node.props?.["data-fallback"] === "domA"), fallbackA);
  assert.strictEqual(group.children.find((node) => node.name === "threeA-waiting"), threeA);
  assert.deepEqual(rows(list), ["a", "b", "c"]);
  assert.deepEqual(threeList.children.map((node) => node.name), ["a", "b", "c"]);
  app.pendingC.resolve("healthy");
  await waitScheduled();
  assert.equal(find(section, (node) => node.props?.["data-health"] === "healthy")?.tag, "span");
  assert.equal(group.children.some((node) => node.name === "healthy"), true);
  assert.strictEqual(find(section, (node) => node.props?.["data-fallback"] === "domB"), fallbackB);
  assert.equal(callbacks, 0);
  app.pendingB.resolve(storeRecord({ sample: storeRecord({ x: 5, y: 6 }) }));
  await waitScheduled();
  assert.equal(work.status, "committed", inspect(work.resolution, { depth: 6 }));
  assert.equal(resourceOnly.status, "committed", inspect(resourceOnly.resolution, { depth: 6 }));
  assert.equal(callbacks, 1);
  assert.equal(resourceCallbacks, 1);
  await waitScheduled();
  assert.equal(local.props["data-local"], 2, "callback's newer local action was lost");
  assert.equal(group.children.find((node) => node.name === "local")?.position.x, 2);
  const selected = domRoot.prepareResources([app.resourceA, app.resourceB]);
  assert.ok(selected, "accepted selected resources did not prepare a scoped no-op");
  selected.discard();
  assert.equal(find(section, (node) => node.props?.["data-slot"] === "a")?.props["data-value"], 10);
  assert.equal(find(section, (node) => node.props?.["data-slot"] === "b")?.props["data-value"], 5);
  assert.deepEqual(rows(list), ["c", "a"]);
  assert.strictEqual(list.children[0], originalRows.get("c"));
  assert.strictEqual(list.children[1], originalRows.get("a"));
  assert.deepEqual(threeList.children.map((node) => node.name), ["c", "a"]);
  assert.strictEqual(threeList.children[0], originalThreeRows.get("c"));
  assert.strictEqual(threeList.children[1], originalThreeRows.get("a"));
  assert.strictEqual(find(section, (node) => node.tag === "button"), local);
  assert.equal(app.trace.cleanups.domA, 2);
  assert.equal(app.trace.cleanups.domB, 2);
  assert.equal(app.trace.cleanups.threeA, 1);
  assert.equal(app.trace.cleanups.threeB, 1);
  assert.equal(app.trace.rows.dom.b.cleanups, 1);
  assert.equal(app.trace.rows.three.b.cleanups, 1);
  assert.strictEqual(find(section, (node) => node.props?.["data-health"] === "healthy")?.tag, "span");
  queue.dispose(); queue = null;
  domRoot.dispose(); dom = null;
  assert.equal(container.children.length, 0);
  forkRoot.dispose(); fork = null;
  assert.equal(forkContainer.children.length, 0);
  three.root.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(three.host.diagnostics.liveHandles, 0);
  three.host.dispose();
  assert.equal(three.host.diagnostics.liveResources, 0);
  assert.equal(three.host.diagnostics.createdResources, three.host.diagnostics.disposedResources);
  three = null;
  for (const slot of ["domA", "domB", "threeA", "threeB"])
    assert.equal(app.trace.mounts[slot], app.trace.cleanups[slot]);
  for (const arm of ["dom", "three"]) for (const row of Object.values(app.trace.rows[arm]))
    assert.equal(row.mounts, row.cleanups);
  await writeFile(path.join(artifact, "result.json"), JSON.stringify({ status: "PASS", closed,
    callbacks, resourceCallbacks, versionsBefore: before, selectedBoundaries: ["a", "b"], independentHealth: true,
  }, null, 2) + "\n", { flag: "wx" });
} catch (error) { primaryError = error; }
const cleanupErrors = [];
try { unsubscribeDom?.(); } catch (error) { cleanupErrors.push(error); }
try { unsubscribeThree?.(); } catch (error) { cleanupErrors.push(error); }
try { queue?.dispose(); } catch (error) { cleanupErrors.push(error); }
try { dom?.root.dispose(); } catch (error) { cleanupErrors.push(error); }
try { fork?.root.dispose(); } catch (error) { cleanupErrors.push(error); }
try { three?.root.dispose(); } catch (error) { cleanupErrors.push(error); }
try { three?.host.dispose(); } catch (error) { cleanupErrors.push(error); }
try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
if (primaryError || cleanupErrors.length) {
  await writeFile(path.join(artifact, "failure.json"), JSON.stringify({ status: "FAIL",
    primaryError: primaryError ? String(primaryError?.stack ?? primaryError) : null,
    cleanupErrors: cleanupErrors.map((error) => String(error?.stack ?? error)),
  }, null, 2) + "\n", { flag: "wx" }).catch(() => {});
  throw new AggregateError([...(primaryError ? [primaryError] : []), ...cleanupErrors],
    "Compiled resource transaction failed");
}
console.log(`PASS compiled resource transaction; provenance: ${artifact}`);
