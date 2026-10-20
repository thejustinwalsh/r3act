import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transformWithOxc } from "vite";
import * as THREE from "three";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { AsyncResource, NativeTaskTransitionQueue, createNativeRoot, createStore,
  createWorld, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const binary = path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const authoredPath = path.join(root, "compiler/fixtures/native-reentrant-replacement.tsx");
const artifact = path.join(root, ".cache", `compiled-reentrant-replacement-${randomUUID()}`);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const tick = async () => {
  for (let index = 0; index < 5; index++) await new Promise(resolve => setTimeout(resolve, 0));
};
const withDeadline = async (promise, label) => {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out`)), 2000);
    })]);
  } finally { clearTimeout(timer); }
};
const find = (node, predicate) => !node ? null : predicate(node) ? node :
  (node.children ?? []).map(child => find(child, predicate)).find(Boolean) ?? null;
const attr = (container, name) =>
  find(container, node => node.props?.[name] !== undefined)?.props[name] ?? null;
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

const plugin = nativeModuleCompilerPlugin({ root, compilerBinary: binary });
let primary, fork, three, transitions, geometry, material, primaryError;
try {
  await mkdir(artifact, { recursive: true });
  const compilerSha256 = sha(await readFile(binary));
  const runtimeUrl = pathToFileURL(path.join(root, "src/native_runtime_api.ts")).href;
  const authored = await readFile(authoredPath, "utf8");
  const source = authored.replaceAll('"@r3act/core"', JSON.stringify(runtimeUrl));
  const sourcePath = path.join(artifact, "native-reentrant-replacement.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  const transformed = await plugin.transform.call({ addWatchFile() {},
    error(message) { throw new Error(String(message)); } }, source, sourcePath);
  assert.ok(transformed?.code, "Rust/OXC did not transform authored TSX");
  assert.match(transformed.code, /registerCompiledSemanticPlan/);
  assert.match(transformed.code, /"module_revision"\s*:\s*"native-v1-[^"]+"/);
  for (const component of ["DomApp", "DomResult", "ThreeApp", "ThreeResult"])
    assert.match(transformed.code,
      new RegExp(`__nativeDefineComponent\\("[^"]*#component:${component}"`));
  for (const task of ["detail", "catalog", "panel"])
    assert.match(transformed.code, new RegExp(`"id"\\s*:\\s*"${task}"`));
  await writeFile(path.join(artifact, "transformed.tsx"), transformed.code, { flag: "wx" });
  const emitted = await transformWithOxc(transformed.code, sourcePath,
    { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
  const executable = `import { jsx, Fragment } from ${JSON.stringify(runtimeUrl)};\n${emitted.code}`;
  const modulePath = path.join(artifact, "executable.mjs");
  await writeFile(modulePath, executable, { flag: "wx" });
  await writeFile(path.join(artifact, "provenance.json"), JSON.stringify({
    compilerSha256, authoredPath, authoredSha256: sha(authored),
    transformedSha256: sha(transformed.code), emittedSha256: sha(executable),
  }, null, 2) + "\n", { flag: "wx" });
  const app = await import(pathToFileURL(modulePath).href);
  const world = createWorld(), query = createStore("A"), urgent = createStore(0);
  const life = { starts: 0, cleanups: 0 };
  const initial = new AsyncResource(Promise.resolve({
    query: "A", detail: "ready-A", catalog: "shared-catalog",
  }));
  const make = rootId => {
    const host = new MemoryVDOMHost(), container = host.createContainer();
    return { root: createNativeRoot(host, container, { world, rootId, scheduleCommit() {} }),
      container };
  };
  primary = make("reentrant-primary");
  fork = make("reentrant-fork");
  const scene = new THREE.Scene();
  geometry = new THREE.BoxGeometry(); material = new THREE.MeshBasicMaterial();
  let borrowedGeometryDisposals = 0, borrowedMaterialDisposals = 0;
  geometry.addEventListener("dispose", () => borrowedGeometryDisposals++);
  material.addEventListener("dispose", () => borrowedMaterialDisposals++);
  three = createThreeNativeRoot(scene, { namespace: THREE,
    rootOptions: { world, rootId: "reentrant-three", scheduleCommit() {} } });
  const domTree = (lane, resource) => jsx(app.DomApp,
    { lane, query, urgent, resource, life });
  const threeTree = resource => jsx(app.ThreeApp,
    { query, urgent, resource, geometry, material });
  primary.root.mount(domTree("primary", initial));
  fork.root.mount(domTree("fork", initial));
  three.root.mount(threeTree(initial));
  await tick();
  primary.root.flush(); fork.root.flush(); three.root.flush();
  assert.equal(attr(primary.container, "data-result"), "A");
  assert.equal(attr(fork.container, "data-result"), "A");
  assert.deepEqual(life, { starts: 2, cleanups: 0 });
  const acceptedResult = scene.getObjectByName("result-A");
  assert.ok(acceptedResult instanceof THREE.Mesh);
  const acceptedGeometry = acceptedResult.geometry, acceptedMaterial = acceptedResult.material;
  const providerA = deferred(), providerC = deferred();
  const trace = [], outcomes = [];
  const request = {
    catalog: "shared-catalog",
    load(value, signal) {
      trace.push(`start:${value}`);
      signal.addEventListener("abort", () => trace.push(`abort:${value}`), { once: true });
      if (value === "B") throw new Error("Superseded B provider was launched");
      return (value === "A" ? providerA : providerC).promise.then(detail => {
        trace.push(`resolve:${value}`);
        return detail;
      });
    },
  };
  transitions = new NativeTaskTransitionQueue();
  const roots = () => [
    { root: primary.root, buildTree: execution => domTree("primary", execution.resource("panel")) },
    { root: three.root, buildTree: execution => threeTree(execution.resource("panel")) },
    { root: fork.root, buildTree: execution => domTree("fork", execution.resource("panel")) },
  ];
  let c;
  const a = transitions.enqueue(app.tasks, roots(), { id: "compiled-a", key: "route",
    inputs: { "$query": "A", "$request": request },
    onSettled: result => {
      outcomes.push(`a:${result.status}`);
      if (result.status === "cancelled") {
        c = transitions.enqueue(app.tasks, roots(), { id: "compiled-c", key: "route",
          inputs: { "$query": "C", "$request": request },
          onSettled: current => outcomes.push(`c:${current.status}`) });
      }
    },
  });
  assert.deepEqual(trace.filter(item => item.startsWith("start:")), ["start:A"]);
  query.dispatch("C"); urgent.dispatch(1);
  await tick();
  primary.root.flush(); fork.root.flush(); three.root.flush();
  assert.equal(attr(primary.container, "data-query"), "C");
  assert.equal(attr(primary.container, "data-urgent"), 1);
  assert.equal(attr(primary.container, "data-result"), "A");
  assert.equal(attr(fork.container, "data-result"), "A");
  assert.ok(scene.getObjectByName("query-C"));
  assert.ok(scene.getObjectByName("urgent-1"));
  assert.equal(scene.getObjectByName("result-A"), acceptedResult);
  assert.deepEqual(life, { starts: 2, cleanups: 0 });
  const b = transitions.enqueue(app.tasks, roots(), { id: "compiled-b", key: "route",
    inputs: { "$query": "B", "$request": request },
    onSettled: result => outcomes.push(`b:${result.status}`),
  });
  assert.equal(a.status, "cancelled");
  assert.equal(b.status, "cancelled");
  assert.equal(c.status, "pending");
  assert.deepEqual(b.snapshot().started, []);
  assert.deepEqual(trace.filter(item => item.startsWith("start:")), ["start:A", "start:C"]);
  assert.equal(attr(primary.container, "data-result"), "A");
  assert.equal(attr(fork.container, "data-result"), "A");
  assert.equal(scene.getObjectByName("result-B"), undefined);
  providerA.resolve("late-A");
  await tick();
  assert.equal(attr(primary.container, "data-result"), "A");
  providerC.resolve("ready-C");
  assert.equal((await withDeadline(c.completion, "compiled C")).status, "committed");
  assert.equal((await a.completion).status, "cancelled");
  assert.equal((await b.completion).status, "cancelled");
  assert.deepEqual(outcomes, ["a:cancelled", "b:cancelled", "c:committed"]);
  assert.equal(attr(primary.container, "data-result"), "C");
  assert.equal(attr(fork.container, "data-result"), "C");
  assert.equal(attr(primary.container, "data-detail"), "ready-C");
  assert.equal(attr(fork.container, "data-detail"), "ready-C");
  const revealedResult = scene.getObjectByName("result-C");
  assert.equal(revealedResult, acceptedResult);
  assert.equal(revealedResult.geometry, acceptedGeometry);
  assert.equal(revealedResult.material, acceptedMaterial);
  assert.deepEqual(life, { starts: 2, cleanups: 0 });
  assert.equal(c.snapshot().started.includes("detail"), true);
  assert.equal(c.snapshot().completed.includes("panel"), true);
  transitions.dispose(); transitions = null;
  primary.root.dispose(); fork.root.dispose(); three.dispose();
  assert.equal(primary.container.children.length, 0);
  assert.equal(fork.container.children.length, 0);
  assert.equal(scene.children.length, 0);
  assert.equal(primary.root.diagnostics().ownerCount, 0);
  assert.equal(fork.root.diagnostics().ownerCount, 0);
  assert.equal(primary.root.diagnostics().pendingChangeCount, 0);
  assert.equal(fork.root.diagnostics().pendingChangeCount, 0);
  assert.equal(three.host.diagnostics.liveHandles, 0);
  assert.equal(three.host.diagnostics.liveResources, 0);
  assert.equal(three.host.diagnostics.createdResources, three.host.diagnostics.disposedResources);
  assert.equal(borrowedGeometryDisposals, 0);
  assert.equal(borrowedMaterialDisposals, 0);
  geometry.dispose(); material.dispose();
  assert.equal(borrowedGeometryDisposals, 1);
  assert.equal(borrowedMaterialDisposals, 1);
  assert.deepEqual(life, { starts: 2, cleanups: 2 });
  assert.equal(query.diagnostics().roots, 0);
  assert.equal(urgent.diagnostics().roots, 0);
  console.log(JSON.stringify({ status: "PASS", artifact, compilerSha256,
    actualCompiledExecution: true, trace, outcomes, life }));
} catch (error) { primaryError = error; }
finally {
  const errors = [];
  for (const dispose of [() => transitions?.dispose(), () => primary?.root.dispose(),
    () => fork?.root.dispose(), () => three?.dispose(), () => plugin.closeBundle?.()]) {
    try { await dispose(); } catch (error) { errors.push(error); }
  }
  if (primaryError || errors.length) throw new AggregateError(
    [...(primaryError ? [primaryError] : []), ...errors],
    "Compiled reentrant replacement fixture failed");
}
