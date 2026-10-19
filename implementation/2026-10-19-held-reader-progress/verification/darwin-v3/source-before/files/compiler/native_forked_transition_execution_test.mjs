import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transformWithOxc } from "vite";
import * as THREE from "three";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { AsyncResource, NativeRootWorkQueue, NativeTaskTransitionQueue,
  createNativeRoot, createStore, createWorld, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const binary = path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const example = path.join(root, "examples/forked-transitions");
const artifact = path.join(root, ".cache", `compiled-forked-transitions-${randomUUID()}`);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const tick = async () => {
  for (let index = 0; index < 5; index++) await new Promise(resolve => setTimeout(resolve, 0));
};
const withDeadline = async (promise, label) => {
  let timer;
  try {
    return await Promise.race([promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), 2000);
      })]);
  } finally {
    clearTimeout(timer);
  }
};
const find = (node, predicate) => !node ? null : predicate(node) ? node :
  (node.children ?? []).map(child => find(child, predicate)).find(Boolean) ?? null;
const attr = (container, name) => find(container, node => node.props?.[name] !== undefined)?.props[name] ?? null;
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

const plugin = nativeModuleCompilerPlugin({ root, compilerBinary: binary });
let primary, fork, three, publications, transitions, primaryError;
try {
  await mkdir(artifact, { recursive: true });
  const compilerSha256 = sha(await readFile(binary));
  const runtimeUrl = pathToFileURL(path.join(root, "src/native_runtime_api.ts")).href;
  const transformedRows = [];
  for (const name of ["app", "scene"]) {
    const authoredPath = path.join(example, `${name}.tsx`);
    const authored = await readFile(authoredPath, "utf8");
    const source = authored.replaceAll('"@r3act/core"', JSON.stringify(runtimeUrl));
    const sourcePath = path.join(artifact, `${name}.tsx`);
    await writeFile(sourcePath, source, { flag: "wx" });
    const transformed = await plugin.transform.call({ addWatchFile() {},
      error(message) { throw new Error(String(message)); } }, source, sourcePath);
    assert.ok(transformed?.code, `Rust/OXC did not transform ${name}.tsx`);
    assert.match(transformed.code, /registerCompiledSemanticPlan/);
    assert.match(transformed.code, /"module_revision"\s*:\s*"native-v1-[^"]+"/);
    for (const component of name === "app" ? ["DomApp", "Result"] : ["ThreeApp", "ThreeResult"])
      assert.match(transformed.code, new RegExp(`__nativeDefineComponent\\("[^"]*#component:${component}"`));
    if (name === "app") {
      for (const id of ["detail", "catalog", "panel"])
        assert.match(transformed.code, new RegExp(`"id"\\s*:\\s*"${id}"`));
      assert.match(transformed.code, /"\$query"/);
      assert.match(transformed.code, /compiledNativeComponentPlan/);
    }
    await writeFile(path.join(artifact, `${name}.transformed.tsx`), transformed.code, { flag: "wx" });
    const emitted = await transformWithOxc(transformed.code, sourcePath,
      { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
    const executable = `import { jsx, Fragment } from ${JSON.stringify(runtimeUrl)};\n${emitted.code}`;
    await writeFile(path.join(artifact, `${name}.mjs`), executable, { flag: "wx" });
    transformedRows.push({ name, authoredSha256: sha(authored),
      transformedSha256: sha(transformed.code), emittedSha256: sha(executable) });
  }
  await writeFile(path.join(artifact, "provenance.json"), JSON.stringify({
    compilerSha256, source: example, transformedRows,
  }, null, 2) + "\n", { flag: "wx" });
  const app = await import(pathToFileURL(path.join(artifact, "app.mjs")).href);
  const sceneApp = await import(pathToFileURL(path.join(artifact, "scene.mjs")).href);
  const world = createWorld();
  const query = createStore("A"), urgent = createStore(0);
  const life = { starts: 0, cleanups: 0 };
  const initial = new AsyncResource(Promise.resolve({
    query: "A", detail: "ready-A", catalog: "shared-catalog",
  }));
  const make = (rootId) => {
    const host = new MemoryVDOMHost(), container = host.createContainer();
    const native = createNativeRoot(host, container, { world, rootId, scheduleCommit() {} });
    return { root: native, container };
  };
  primary = make("compiled-fork-primary");
  fork = make("compiled-fork-inspector");
  const scene = new THREE.Scene();
  const geometry = new THREE.BoxGeometry(), material = new THREE.MeshBasicMaterial();
  let borrowedGeometryDisposals = 0, borrowedMaterialDisposals = 0;
  geometry.addEventListener("dispose", () => borrowedGeometryDisposals++);
  material.addEventListener("dispose", () => borrowedMaterialDisposals++);
  three = createThreeNativeRoot(scene, { namespace: THREE,
    rootOptions: { world, rootId: "compiled-fork-three", scheduleCommit() {} } });
  const domTree = (lane, resource) => jsx(app.DomApp, { lane, query, urgent, resource, life });
  const threeTree = resource => jsx(sceneApp.ThreeApp,
    { query, urgent, resource, geometry, material });
  primary.root.mount(domTree("primary", initial));
  fork.root.mount(domTree("fork", initial));
  three.root.mount(threeTree(initial));
  await tick();
  primary.root.flush(); fork.root.flush(); three.root.flush();
  assert.equal(attr(primary.container, "data-result"), "A");
  assert.equal(attr(fork.container, "data-result"), "A");
  const acceptedResult = scene.getObjectByName("result-A");
  assert.ok(acceptedResult instanceof THREE.Mesh);
  const acceptedGeometry = acceptedResult.geometry;
  const acceptedMaterial = acceptedResult.material;
  publications = new NativeRootWorkQueue();
  transitions = new NativeTaskTransitionQueue();
  const publish = async (id, roots, transition, finishTransitions) => {
    let resolveSettled;
    const settled = new Promise(resolve => { resolveSettled = resolve; });
    publications.enqueue({ id, roots, transitions: [transition], finishTransitions,
      onSettled: resolveSettled });
    const outcome = await withDeadline(settled, id);
    if (outcome.status !== "committed")
      throw outcome.error ?? new Error(`Host publication ${id}: ${outcome.status}`);
  };
  query.beginTransition("query-B", [primary.root.rootId, three.root.rootId, fork.root.rootId]);
  query.dispatch("B", { kind: "transition", transitionId: "query-B" });
  await publish("compiled-B-primary-three", [
    { root: primary.root, tree: domTree("primary", initial) },
    { root: three.root, tree: threeTree(initial) },
  ], "query-B", true);
  assert.equal(attr(primary.container, "data-query"), "B");
  assert.equal(attr(fork.container, "data-query"), "A");
  assert.equal(attr(primary.container, "data-result"), "A");
  assert.ok(scene.getObjectByName("query-B"));
  const providers = { A: deferred(), B: deferred(), C: deferred() };
  const trace = [];
  const request = {
    catalog: "shared-catalog",
    load(value, signal) {
      trace.push(`start:${value}`);
      signal.addEventListener("abort", () => trace.push(`abort:${value}`), { once: true });
      return providers[value].promise.then(detail => {
        trace.push(`resolve:${value}`);
        return detail;
      });
    },
  };
  const detail = transitions.enqueue(app.tasks, [
    { root: primary.root, buildTree: execution => domTree("primary", execution.resource("panel")) },
    { root: three.root, buildTree: execution => threeTree(execution.resource("panel")) },
    { root: fork.root, buildTree: execution => domTree("fork", execution.resource("panel")) },
  ], { id: "compiled-detail", inputs: { "$request": request }, liveInputs: { "$query": query } });
  const taskContext = () => JSON.stringify({
    task: detail.snapshot(),
    resolution: { ...detail.resolution,
      error: detail.resolution.error instanceof Error
        ? { name: detail.resolution.error.name, message: detail.resolution.error.message,
          stack: detail.resolution.error.stack }
        : String(detail.resolution.error ?? "") },
    trace,
    queryHead: query.getState(),
    stores: { query: query.diagnostics(), urgent: urgent.diagnostics() },
    projected: [primary.root, three.root, fork.root].map(root => ({
      rootId: root.rootId, query: query.getStateForRoot(root.rootId),
      native: root.diagnostics(),
    })),
  });
  assert.deepEqual(trace.filter(item => item.startsWith("start:")).sort(),
    ["start:A", "start:B"], taskContext());
  assert.equal(attr(primary.container, "data-result"), "A");
  await publish("compiled-B-fork", [{ root: fork.root, tree: domTree("fork", initial) }],
    "query-B", true);
  await tick();
  assert.equal(attr(fork.container, "data-query"), "B");
  assert.equal(trace.filter(item => item === "start:B").length, 1,
    `Converged fork restarted the already-running B provider: ${taskContext()}`);
  assert.equal(trace.filter(item => item === "abort:A").length, 1, taskContext());
  urgent.dispatch(1);
  await tick();
  primary.root.flush(); fork.root.flush(); three.root.flush();
  assert.equal(attr(primary.container, "data-urgent"), 1);
  assert.equal(attr(fork.container, "data-urgent"), 1);
  assert.ok(scene.getObjectByName("urgent-1"));
  query.beginTransition("query-C", [primary.root.rootId, three.root.rootId, fork.root.rootId]);
  query.dispatch("C", { kind: "transition", transitionId: "query-C" });
  await publish("compiled-C-all", [
    { root: primary.root, tree: domTree("primary", initial) },
    { root: three.root, tree: threeTree(initial) },
    { root: fork.root, tree: domTree("fork", initial) },
  ], "query-C", true);
  await tick();
  assert.equal(trace.filter(item => item === "start:C").length, 1, taskContext());
  assert.equal(trace.filter(item => item === "abort:B").length, 1, taskContext());
  providers.B.resolve("late-B");
  providers.A.resolve("late-A");
  await tick();
  assert.equal(attr(primary.container, "data-result"), "A");
  assert.equal(attr(fork.container, "data-result"), "A");
  assert.equal(scene.getObjectByName("result-B"), undefined);
  providers.C.resolve("ready-C");
  assert.equal((await withDeadline(detail.completion, "compiled detail")).status, "committed");
  assert.equal(attr(primary.container, "data-result"), "C");
  assert.equal(attr(fork.container, "data-result"), "C");
  const revealedResult = scene.getObjectByName("result-C");
  assert.equal(revealedResult, acceptedResult);
  assert.equal(revealedResult.geometry, acceptedGeometry);
  assert.equal(revealedResult.material, acceptedMaterial);
  assert.equal(detail.snapshot().reused.includes("catalog"), true);
  const abandonedProvider = deferred();
  const abandoned = transitions.enqueue(app.tasks, [
    { root: primary.root, buildTree: execution => domTree("primary", execution.resource("panel")) },
  ], { id: "compiled-early-disposal",
    inputs: { "$request": { catalog: "shared-catalog", load: () => abandonedProvider.promise } },
    liveInputs: { "$query": query } });
  assert.equal(abandoned.status, "pending");
  assert.equal(attr(primary.container, "data-result"), "C");
  assert.equal(abandoned.cancel("caller retired the view").status, "cancelled");
  transitions.dispose(); transitions = null;
  publications.dispose(); publications = null;
  primary.root.dispose();
  assert.equal(primary.root.diagnostics().ownerCount, 0);
  assert.equal(primary.root.diagnostics().pendingChangeCount, 0);
  fork.root.dispose();
  assert.equal(fork.root.diagnostics().ownerCount, 0);
  assert.equal(fork.root.diagnostics().pendingChangeCount, 0);
  three.dispose();
  assert.equal(three.host.diagnostics.liveHandles, 0);
  assert.equal(three.host.diagnostics.liveResources, 0);
  assert.equal(three.host.diagnostics.createdResources, three.host.diagnostics.disposedResources);
  assert.equal(borrowedGeometryDisposals, 0);
  assert.equal(borrowedMaterialDisposals, 0);
  geometry.dispose(); material.dispose();
  assert.equal(borrowedGeometryDisposals, 1);
  assert.equal(borrowedMaterialDisposals, 1);
  abandonedProvider.resolve("late-after-disposal");
  await tick();
  assert.equal(primary.container.children.length, 0);
  assert.equal(fork.container.children.length, 0);
  assert.equal(scene.children.length, 0);
  assert.equal(life.starts, life.cleanups);
  assert.equal(query.diagnostics().roots, 0);
  assert.equal(urgent.diagnostics().roots, 0);
  console.log(JSON.stringify({ status: "PASS", artifact, compilerSha256,
    actualCompiledExecution: true, trace, life, reused: detail.snapshot().reused }));
} catch (error) { primaryError = error; }
finally {
  const errors = [];
  for (const dispose of [() => transitions?.dispose(), () => publications?.dispose(),
    () => primary?.root.dispose(), () => fork?.root.dispose(), () => three?.dispose(),
    () => plugin.closeBundle?.()]) {
    try { await dispose(); } catch (error) { errors.push(error); }
  }
  if (primaryError || errors.length) throw new AggregateError(
    [...(primaryError ? [primaryError] : []), ...errors], "Compiled forked transition fixture failed");
}
