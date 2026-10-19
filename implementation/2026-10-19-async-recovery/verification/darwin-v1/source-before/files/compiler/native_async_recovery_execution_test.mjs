import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transformWithOxc } from "vite";
import { parse } from "@babel/parser";
import * as THREE from "three";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { createNativeRoot, createWorld, jsx } from "../src/native_runtime_api.ts";
import { NativeRootWorkQueue } from "../src/native_root_work_queue.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { AsyncResource } from "../src/async_resource_runtime.ts";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const binary = path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const fixture = path.join(root, "implementation/2026-10-19-async-recovery/fixture/native_arm.tsx");
const artifact = path.join(root, ".cache", `compiled-async-recovery-${randomUUID()}`);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const waitScheduled = async () => {
  for (let index = 0; index < 5; index++) await new Promise((done) => setTimeout(done, 0));
};
const find = (node, predicate) => !node ? null : predicate(node) ? node :
  (node.children ?? []).map((child) => find(child, predicate)).find(Boolean) ?? null;
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const plugin = nativeModuleCompilerPlugin({ root, compilerBinary: binary });
let dom, fork, three, queue, scoped, primaryError;
try {
  await mkdir(artifact, { recursive: true });
  const authored = await readFile(fixture, "utf8");
  const runtimeUrl = pathToFileURL(path.join(root, "src/native_runtime_api.ts")).href;
  const source = authored.replace('"@r3act/core"', JSON.stringify(runtimeUrl));
  const sourcePath = path.join(artifact, "native_arm.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  const compilerSha256 = sha(await readFile(binary));
  const transformed = await plugin.transform.call({ addWatchFile() {},
    error(message) { throw new Error(String(message)); } }, source, sourcePath);
  assert.ok(transformed?.code, "Rust/OXC did not transform authored recovery TSX");
  assert.match(transformed.code, /registerCompiledSemanticPlan/, "emitted semantic plan registration missing");
  assert.match(transformed.code, /"source_file"\s*:\s*"[^"]*native_arm\.tsx"/,
    "emitted plan does not identify the authored source");
  assert.match(transformed.code, /"module_revision"\s*:\s*"native-v1-[^"]+"/,
    "emitted plan lacks module revision");
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const definitions = new Map();
  for (const item of ast.program.body) if (item.type === "ExpressionStatement" &&
    item.expression.type === "CallExpression" &&
    /DefineComponent$/.test(item.expression.callee.name ?? "")) {
    const id = item.expression.arguments[0]?.value;
    if (typeof id === "string") definitions.set(id.slice(id.lastIndexOf("#component:") + 11), item.expression);
  }
  for (const name of ["AppDom", "ReadDom", "AppThree", "ReadThree", "ScopedDom", "ScopedRoot"])
    assert.ok(definitions.has(name), `${name} lacks actual compiled registration`);
  const scopedDefinition = definitions.get("ScopedDom");
  const scopedId = scopedDefinition.arguments[0].value;
  const metadata = scopedDefinition.arguments[2];
  const closed = metadata?.properties?.find((entry) =>
    (entry.key?.name ?? entry.key?.value) === "closedResourceHostProgram")?.value;
  const closedId = closed?.properties?.find((entry) =>
    (entry.key?.name ?? entry.key?.value) === "componentProgramId")?.value?.value;
  assert.equal(closedId, scopedId, "selected direct resource leaf lacks compiler-proven closed program");
  await writeFile(path.join(artifact, "native_arm.transformed.tsx"), transformed.code, { flag: "wx" });
  const emitted = await transformWithOxc(transformed.code, sourcePath,
    { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
  const output = path.join(artifact, "native_arm.mjs");
  await writeFile(output, emitted.code, { flag: "wx" });
  await writeFile(path.join(artifact, "provenance.json"), JSON.stringify({
    compilerSha256, authoredSha256: sha(authored), transformedSha256: sha(transformed.code),
    emittedSha256: sha(emitted.code), sourcePath: fixture,
    componentIds: Object.fromEntries([...definitions].map(([name, call]) => [name, call.arguments[0].value])),
  }, null, 2) + "\n", { flag: "wx" });
  const app = await import(pathToFileURL(output).href);
  const world = createWorld();
  const host = new MemoryVDOMHost(), container = host.createContainer();
  dom = createNativeRoot(host, container, { world, rootId: `recovery-dom-${randomUUID()}` });
  dom.mount(jsx(app.AppDom, {}));
  const forkHost = new MemoryVDOMHost(), forkContainer = forkHost.createContainer();
  fork = createNativeRoot(forkHost, forkContainer, { world, rootId: `recovery-fork-${randomUUID()}` });
  fork.mount(jsx(app.AppDom, {}));
  const scene = new THREE.Scene();
  three = createThreeNativeRoot(scene, { namespace: THREE,
    rootOptions: { world, rootId: `recovery-three-${randomUUID()}` } });
  three.root.mount(jsx(app.AppThree, {}));
  await waitScheduled();
  const value = (rootNode) => find(rootNode, (node) => node.props?.["data-value"] !== undefined)?.props["data-value"];
  const error = (rootNode) => find(rootNode, (node) => node.props?.["data-error"] !== undefined)?.props["data-error"];
  assert.equal(value(container), "accepted");
  assert.equal(value(forkContainer), "accepted");
  assert.equal(scene.children[0].children.some((node) => node.name === "accepted"), true);
  queue = new NativeRootWorkQueue();
  let number = 0;
  function replace(provider) {
    const resource = new AsyncResource(provider.promise);
    const id = `node-recovery-${++number}`;
    const roots = [dom, fork, three.root];
    app.resourceStore.beginTransition(id, roots.map((item) => item.rootId));
    app.resourceStore.dispatch(resource, { kind: "transition", transitionId: id });
    const handle = queue.enqueue({ id, roots: [
      { root: dom, tree: jsx(app.AppDom, {}) },
      { root: fork, tree: jsx(app.AppDom, {}) },
      { root: three.root, tree: jsx(app.AppThree, {}) },
    ], transitions: [id], finishTransitions: true,
    onSettled() {
      if (!app.resourceStore.hasTransition(id)) return;
      for (const root of roots) if (app.resourceStore.transitionRoots(id).includes(root.rootId))
        app.resourceStore.releaseTransition(id, root.rootId);
      app.resourceStore.finishTransition(id);
    } });
    return { resource, handle };
  }
  const firstProvider = deferred(), first = replace(firstProvider);
  await waitScheduled();
  assert.equal(value(container), "accepted", "pending work discarded accepted DOM view");
  assert.equal(value(forkContainer), "accepted", "pending work discarded accepted fork view");
  app.urgentStore.dispatch(1);
  await waitScheduled();
  assert.equal(find(container, (node) => node.props?.["data-urgent"] === 1)?.tag, "output");
  firstProvider.reject("provider-failed");
  await waitScheduled();
  assert.equal(error(container), "provider-failed");
  assert.equal(error(forkContainer), "provider-failed");
  assert.equal(scene.children[0].children.some((node) => node.name === "error-provider-failed"), true);
  const staleProvider = deferred(), stale = replace(staleProvider);
  await waitScheduled();
  assert.equal(error(container), "provider-failed", "queued retry lost accepted error view");
  stale.handle.cancel("superseded by explicit retry");
  const finalProvider = deferred(), final = replace(finalProvider);
  staleProvider.resolve({ label: "stale", x: 99 });
  await waitScheduled();
  assert.notEqual(value(container), "stale");
  assert.notEqual(value(forkContainer), "stale");
  assert.equal(scene.children[0].children.some((node) => node.name === "stale"), false);
  app.urgentStore.dispatch(2);
  finalProvider.resolve({ label: "recovered", x: 7 });
  await waitScheduled();
  assert.equal(first.handle.status, "committed", "error view was not a successful publication");
  assert.equal(stale.handle.status, "cancelled");
  assert.equal(final.handle.status, "committed");
  assert.equal(value(container), "recovered");
  assert.equal(value(forkContainer), "recovered");
  assert.equal(scene.children[0].children.some((node) => node.name === "recovered"), true);
  assert.equal(find(container, (node) => node.props?.["data-urgent"] === 2)?.tag, "output");
  assert.equal(app.life.errorMounts >= 2, true);
  const scopedProvider = deferred();
  const scopedResource = new AsyncResource(scopedProvider.promise);
  const scopedHost = new MemoryVDOMHost(), scopedContainer = scopedHost.createContainer();
  scoped = createNativeRoot(scopedHost, scopedContainer, { world,
    rootId: `recovery-scoped-${randomUUID()}` });
  scoped.mount(jsx(app.ScopedRoot, { resource: scopedResource }));
  assert.equal(find(scopedContainer, (node) => node.props?.["data-pending"] === "true")?.tag, "output");
  const selected = queue.enqueueResources({ id: `rejected-selected-${randomUUID()}`,
    roots: [{ root: scoped, resources: [scopedResource] }] });
  assert.equal(selected.status, "pending");
  scopedProvider.reject("scoped-failure");
  await waitScheduled();
  assert.equal(selected.status, "failed", "rejected scoped resource was incorrectly admitted");
  assert.match(String(selected.resolution.error), /Scoped root delta is unavailable/);
  assert.equal(error(scopedContainer), "scoped-failure", "failed selected hold hid generic error");
  scoped.dispose(); scoped = null;
  assert.equal(scopedContainer.children.length, 0);
  queue.dispose(); queue = null;
  dom.dispose();
  assert.equal(dom.diagnostics().ownerCount, 0);
  assert.equal(dom.diagnostics().pendingChangeCount, 0);
  dom = null;
  fork.dispose();
  assert.equal(fork.diagnostics().ownerCount, 0);
  assert.equal(fork.diagnostics().pendingChangeCount, 0);
  fork = null;
  three.root.dispose();
  assert.equal(three.root.diagnostics().ownerCount, 0);
  assert.equal(three.root.diagnostics().pendingChangeCount, 0);
  assert.equal(three.host.diagnostics.liveHandles, 0);
  three.host.dispose();
  assert.equal(three.host.diagnostics.liveResources, 0);
  assert.equal(three.host.diagnostics.createdResources, three.host.diagnostics.disposedResources);
  three = null;
  assert.equal(container.children.length, 0);
  assert.equal(forkContainer.children.length, 0);
  assert.equal(scene.children.length, 0);
  assert.equal(app.life.readyMounts, app.life.readyCleanups);
  assert.equal(app.life.errorMounts, app.life.errorCleanups);
  assert.equal(app.resourceStore.hasTransition("node-recovery-1"), false);
  assert.equal(app.resourceStore.hasTransition("node-recovery-2"), false);
  assert.equal(app.resourceStore.hasTransition("node-recovery-3"), false);
  console.log(JSON.stringify({ status: "PASS", artifact, compilerSha256,
    actualCompiledExecution: true, roots: ["DOM", "fork", "Three"],
    firstStatus: first.handle.status, staleStatus: stale.handle.status,
    finalStatus: final.handle.status, life: app.life }));
} catch (error) { primaryError = error; }
finally {
  const cleanupErrors = [];
  for (const dispose of [() => queue?.dispose(), () => dom?.dispose(), () => fork?.dispose(),
    () => scoped?.dispose(), () => three?.root.dispose(), () => three?.host.dispose(),
    () => plugin.closeBundle?.()]) {
    try { await dispose(); } catch (error) { cleanupErrors.push(error); }
  }
  if (primaryError || cleanupErrors.length) throw new AggregateError(
    [...(primaryError ? [primaryError] : []), ...cleanupErrors], "Async recovery fixture failed");
}
