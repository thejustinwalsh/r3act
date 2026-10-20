import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transformWithOxc } from "vite";
import * as THREE from "three";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { AsyncResource, NativeRootWorkQueue, createNativeRoot, createStore,
  createWorld, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";
import { captureCompiledSemanticRevision,
  invalidateCompiledSemanticPlan } from "../src/compiled_semantic_plan.ts";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const binary = path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const example = path.join(root, "examples/arrow-components");
const artifact = path.join(root, ".cache", `compiled-arrow-components-${randomUUID()}`);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const tick = async () => {
  for (let index = 0; index < 5; index++) await new Promise((resolve) => setTimeout(resolve, 0));
};
const find = (node, predicate) => !node ? null : predicate(node) ? node :
  (node.children ?? []).map((child) => find(child, predicate)).find(Boolean) ?? null;
const by = (container, name, value) => find(container, (node) => node.props?.[name] === value);
const attr = (container, name) => find(container, (node) => node.props?.[name] !== undefined)?.props[name] ?? null;
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const withDeadline = async (promise, label) => {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out`)), 2000);
    })]);
  } finally { clearTimeout(timer); }
};

const plugin = nativeModuleCompilerPlugin({ root, compilerBinary: binary });
const registered = [];
let dom, three, queue, unsubscribe, primaryError;
try {
  await mkdir(artifact, { recursive: true });
  const compilerSha256 = sha(await readFile(binary));
  const runtimeUrl = pathToFileURL(path.join(root, "src/native_runtime_api.ts")).href;
  const rows = [];
  for (const name of ["app", "scene"]) {
    const authoredPath = path.join(example, `${name}.tsx`);
    const authored = await readFile(authoredPath, "utf8");
    const rewritten = authored.replaceAll('"@r3act/core"', JSON.stringify(runtimeUrl));
    const sourcePath = path.join(artifact, `${name}.tsx`);
    await writeFile(sourcePath, rewritten, { flag: "wx" });
    const transformed = await plugin.transform.call({ addWatchFile() {},
      error(message) { throw new Error(String(message)); } }, rewritten, sourcePath);
    assert.ok(transformed?.code, `Rust/OXC did not transform ${name}.tsx`);
    assert.match(transformed.code, /registerCompiledSemanticPlan/);
    assert.match(transformed.code, /"module_revision"\s*:\s*"native-v1-[^"]+"/);
    const revision = transformed.code.match(/"module_revision"\s*:\s*"([^"]+)"/)?.[1];
    const sourceFile = transformed.code.match(/"source_file"\s*:\s*"([^"]+)"/)?.[1];
    assert.ok(revision);
    assert.ok(sourceFile);
    registered.push({ sourceFile, revision });
    for (const component of name === "app"
      ? ["ArrowBadge", "ArrowRow", "ArrowResult", "ArrowApp"]
      : ["ArrowMesh", "ArrowScene"])
      assert.match(transformed.code,
        new RegExp(`__nativeDefineComponent\\("[^"]*#component:${component}"`));
    await writeFile(path.join(artifact, `${name}.transformed.tsx`), transformed.code,
      { flag: "wx" });
    const emitted = await transformWithOxc(transformed.code, sourcePath,
      { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
    const executable = `import { jsx, Fragment } from ${JSON.stringify(runtimeUrl)};\n${emitted.code}`;
    await writeFile(path.join(artifact, `${name}.mjs`), executable, { flag: "wx" });
    rows.push({ name, authoredSha256: sha(authored), rewrittenSha256: sha(rewritten),
      transformedSha256: sha(transformed.code), emittedSha256: sha(executable) });
  }
  assert.equal(sha(await readFile(binary)), compilerSha256,
    "Compiler changed during the actual compiled execution fixture");
  await writeFile(path.join(artifact, "provenance.json"), JSON.stringify({
    compilerSha256, source: example, rows,
  }, null, 2) + "\n", { flag: "wx" });
  const app = await import(pathToFileURL(path.join(artifact, "app.mjs")).href);
  const sceneApp = await import(pathToFileURL(path.join(artifact, "scene.mjs")).href);
  for (const name of ["ArrowBadge", "ArrowRow", "ArrowResult", "ArrowApp"])
    assert.equal(app[name].name, name, `${name} lost its inferred arrow function name`);
  for (const name of ["ArrowMesh", "ArrowScene"])
    assert.equal(sceneApp[name].name, name, `${name} lost its inferred arrow function name`);
  for (const { sourceFile, revision } of registered)
    assert.ok(captureCompiledSemanticRevision(sourceFile, revision),
      `Compiled module did not register its source/revision: ${sourceFile}`);
  const world = createWorld(), stage = createStore("A"), urgent = createStore(0);
  const host = new MemoryVDOMHost(), container = host.createContainer();
  dom = createNativeRoot(host, container,
    { world, rootId: "compiled-arrow-dom", scheduleCommit() {} });
  const scene = new THREE.Scene();
  three = createThreeNativeRoot(scene, { namespace: THREE,
    rootOptions: { world, rootId: "compiled-arrow-three", scheduleCommit() {} } });
  queue = new NativeRootWorkQueue();
  const life = { mounts: 0, cleanups: 0, conditionalMounts: 0,
    conditionalCleanups: 0, resultMounts: 0, resultCleanups: 0 };
  const refs = { a: { current: null }, b: { current: null }, c: { current: null } };
  let order = ["a", "b"];
  const initial = new AsyncResource(Promise.resolve({ stage: "A", detail: "ready-A" }));
  const domTree = (resource) => jsx(app.ArrowApp, { stage, urgent, resource,
    rows: order, refs, life });
  const threeTree = (resource) => jsx(sceneApp.ArrowScene, { stage, urgent, resource });
  dom.mount(domTree(initial));
  three.root.mount(threeTree(initial));
  await tick();
  dom.flush(); three.root.flush();
  assert.equal(attr(container, "data-result"), "A");
  assert.ok(scene.getObjectByName("result-A"));
  assert.equal(attr(container, "data-badge"), "A");
  assert.equal(attr(container, "data-lexical-arguments"), "undefined",
    "Expression arrow acquired an ordinary function arguments binding");
  assert.equal(attr(container, "data-lexical-this"), "undefined",
    "Expression arrow acquired an ordinary function this binding");
  const first = refs.a.current;
  assert.ok(first, "ArrowRow ref did not attach");
  first.props.onClick();
  dom.flush();
  assert.equal(by(container, "data-row", "a")?.props["data-count"], 1);
  assert.equal(life.conditionalMounts - life.conditionalCleanups, 1,
    "Odd-count conditional arrow effect did not activate");
  order = ["b", "a", "c"];
  dom.update(domTree(initial));
  assert.equal(refs.a.current, first, "Keyed move replaced arrow row identity");
  assert.equal(by(container, "data-row", "a")?.props["data-count"], 1);
  assert.equal(life.conditionalMounts - life.conditionalCleanups, 1,
    "Keyed move retired a live conditional arrow effect");
  first.props.onClick();
  dom.flush();
  assert.equal(by(container, "data-row", "a")?.props["data-count"], 2);
  assert.equal(life.conditionalMounts, life.conditionalCleanups,
    "Even-count render kept a conditional arrow effect active");
  first.props.onClick();
  dom.flush();
  assert.equal(by(container, "data-row", "a")?.props["data-count"], 3);
  assert.equal(life.conditionalMounts - life.conditionalCleanups, 1,
    "Returning to odd count did not reactivate the effect");
  assert.ok(refs.c.current, "Conditional arrow row was not activated");
  assert.equal(life.mounts - life.cleanups, 3);
  const retired = refs.b.current;
  order = ["a", "c"];
  dom.update(domTree(initial));
  assert.equal(refs.b.current, null, "Removed arrow row retained its ref");
  assert.equal(life.mounts - life.cleanups, 2);
  assert.notEqual(retired, refs.a.current);

  const observations = [];
  unsubscribe = stage.subscribe(three.root.rootId, () => observations.push({
    dom: attr(container, "data-stage"), three: scene.getObjectByName("stage-B")?.name ?? null,
  }));
  stage.beginTransition("arrow-B", [dom.rootId, three.root.rootId]);
  stage.dispatch("B", { kind: "transition", transitionId: "arrow-B" });
  let resolvePublished;
  const published = new Promise((resolve) => { resolvePublished = resolve; });
  queue.enqueue({ id: "compiled-arrow-B", roots: [
    { root: dom, tree: domTree(initial) }, { root: three.root, tree: threeTree(initial) },
  ], transitions: ["arrow-B"], finishTransitions: true, onSettled: resolvePublished });
  assert.equal((await withDeadline(published, "coordinated arrow publication")).status, "committed");
  assert.equal(attr(container, "data-stage"), "B");
  assert.ok(scene.getObjectByName("stage-B"));
  assert.ok(observations.some((item) => item.dom === "B" && item.three === "stage-B"),
    "Store subscriber did not observe both accepted hosts");
  unsubscribe(); unsubscribe = null;

  const failedProvider = deferred();
  const failedResource = new AsyncResource(failedProvider.promise);
  const failed = queue.enqueue({ id: "compiled-arrow-failure", roots: [
    { root: dom, tree: domTree(failedResource) },
    { root: three.root, tree: threeTree(failedResource) },
  ] });
  await tick();
  assert.equal(attr(container, "data-result"), "A", "Pending arrow work lost accepted DOM view");
  urgent.dispatch(1);
  await tick();
  dom.flush(); three.root.flush();
  assert.equal(attr(container, "data-urgent"), 1, "Urgent Store update stalled behind resource");
  assert.ok(scene.getObjectByName("urgent-1"));
  failedProvider.reject("first-provider-failed");
  await tick();
  assert.equal(failed.status, "committed", "Accepted resource error did not publish");
  assert.equal(attr(container, "data-error"), "first-provider-failed");
  assert.ok(scene.getObjectByName("result-error-first-provider-failed"));
  const staleProvider = deferred();
  const staleResource = new AsyncResource(staleProvider.promise);
  const stale = queue.enqueue({ id: "compiled-arrow-stale", roots: [
    { root: dom, tree: domTree(staleResource) },
    { root: three.root, tree: threeTree(staleResource) },
  ] });
  await tick();
  assert.equal(attr(container, "data-error"), "first-provider-failed",
    "Pending retry revived older successful content");
  assert.equal(stale.cancel("new arrow retry superseded it").status, "cancelled");
  const finalProvider = deferred();
  const finalResource = new AsyncResource(finalProvider.promise);
  const final = queue.enqueue({ id: "compiled-arrow-retry", roots: [
    { root: dom, tree: domTree(finalResource) },
    { root: three.root, tree: threeTree(finalResource) },
  ] });
  staleProvider.resolve({ stage: "stale", detail: "discarded" });
  await tick();
  assert.notEqual(attr(container, "data-result"), "stale");
  assert.equal(scene.getObjectByName("result-stale"), undefined);
  finalProvider.resolve({ stage: "B", detail: "ready-B" });
  await tick();
  assert.equal(final.status, "committed");
  assert.equal(attr(container, "data-result"), "B");
  assert.equal(attr(container, "data-detail"), "ready-B");
  assert.ok(scene.getObjectByName("result-B"));
  assert.equal(refs.a.current, first);
  assert.equal(by(container, "data-row", "a")?.props["data-count"], 3);
  const retiringProvider = deferred();
  const retiringResource = new AsyncResource(retiringProvider.promise);
  const retiring = queue.enqueue({ id: "compiled-arrow-retire", roots: [
    { root: dom, tree: domTree(retiringResource) },
    { root: three.root, tree: threeTree(retiringResource) },
  ] });
  assert.equal(retiring.status, "pending");
  for (const { sourceFile, revision } of registered)
    assert.equal(invalidateCompiledSemanticPlan(sourceFile, revision), true);
  await tick();
  assert.equal(dom.retired, true, "Authored DOM module retirement left its root live");
  assert.equal(three.root.retired, true, "Authored Three module retirement left its root live");
  assert.equal(retiring.status, "cancelled",
    "Registered revision retirement did not cancel pending owner work");
  queue.dispose(); queue = null;
  dom.dispose(); three.dispose();
  retiringProvider.resolve({ stage: "late", detail: "retired" });
  await tick();
  assert.equal(container.children.length, 0);
  assert.equal(scene.children.length, 0);
  assert.equal(life.mounts, life.cleanups);
  assert.equal(life.conditionalMounts, life.conditionalCleanups);
  assert.equal(life.resultMounts, life.resultCleanups);
  assert.equal(stage.diagnostics().roots, 0);
  assert.equal(urgent.diagnostics().roots, 0);
  assert.equal(three.host.diagnostics.liveHandles, 0);
  assert.equal(three.host.diagnostics.liveResources, 0);
  assert.equal(sha(await readFile(binary)), compilerSha256,
    "Compiler changed after the actual compiled execution fixture");
  console.log(JSON.stringify({ status: "PASS", artifact, compilerSha256,
    actualCompiledExecution: true, components: 6, life,
    statuses: { failed: failed.status, stale: stale.status,
      final: final.status, retiring: retiring.status } }));
} catch (error) { primaryError = error; }
finally {
  const errors = [];
  for (const cleanup of [() => unsubscribe?.(), () => queue?.dispose(),
    () => dom?.dispose(), () => three?.dispose(),
    ...registered.map(({ sourceFile }) => () => invalidateCompiledSemanticPlan(sourceFile)),
    () => plugin.closeBundle?.()]) {
    try { await cleanup(); } catch (error) { errors.push(error); }
  }
  if (primaryError || errors.length) throw new AggregateError(
    [...(primaryError ? [primaryError] : []), ...errors],
    "Compiled arrow component fixture failed");
}
