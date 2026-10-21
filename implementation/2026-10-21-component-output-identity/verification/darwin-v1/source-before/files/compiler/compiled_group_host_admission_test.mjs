import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as THREE from "three";
import { transformWithOxc } from "vite";
import { nativeModulePlugin } from "./vite_native_plugin.ts";
import {
  createNativeRoot, inspectCompiledSemanticPlan, jsx, NativeRootWorkQueue,
} from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { createThreeHost } from "../src/three_host.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.join(projectRoot, ".cache", `compiled-group-admission-${randomUUID()}`);
const runtimePath = path.join(projectRoot, "src/native_runtime_api.ts");
const runtimeUrl = pathToFileURL(runtimePath).href;
const authored = `import { jsx } from ${JSON.stringify(runtimeUrl)};
export function Scene(props) {
  return <group key="scene"><mesh key="mesh" position-x={props.step} /></group>;
}
export function Dom(props) {
  return <output key="status" data-step={props.step}>step:{props.step}</output>;
}`;
const plugin = nativeModulePlugin({ root: projectRoot,
  compilerBinary: path.join(projectRoot, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike") });
plugin.configResolved?.call({}, { root: projectRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier) { return specifier === runtimeUrl ? { id: runtimePath } : null; },
  error(message) { throw new Error(String(message)); },
};
let queue, sceneRoot, domRoot, threeHost;
let primaryError;
const cleanupErrors = [];
try {
  await mkdir(directory, { recursive: true });
  const sourcePath = path.join(directory, "group.tsx");
  await writeFile(sourcePath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, sourcePath);
  assert.ok(transformed?.code && transformed.code !== authored, "Rust/OXC transform missing");
  await writeFile(path.join(directory, "group.transformed.tsx"), transformed.code, { flag: "wx" });
  const sceneId = transformed.code.match(/__nativeDefineComponent\(\s*"([^"]*#component:Scene)"/)?.[1];
  const domId = transformed.code.match(/__nativeDefineComponent\(\s*"([^"]*#component:Dom)"/)?.[1];
  const planMatch = transformed.code.match(/__registerNativeSemanticPlan\((\{[\s\S]*?\})\);/);
  assert.ok(sceneId && domId && planMatch, "compiled owners or semantic plan missing");
  const plan = JSON.parse(planMatch[1]);
  assert.equal(plan.source_file, path.relative(projectRoot, sourcePath));
  assert.match(plan.module_revision, /^native-v1-[a-f0-9]+$/);
  assert.deepEqual(new Set(plan.owners.map((owner) => owner.site_id)), new Set([sceneId, domId]));
  const emitted = await transformWithOxc(transformed.code, sourcePath, {
    lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" },
  });
  const outputPath = path.join(directory, "group.emitted.mjs");
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  const app = await import(`${pathToFileURL(outputPath).href}?run=${randomUUID()}`);
  const moduleId = sceneId.slice(0, sceneId.lastIndexOf("#component:"));
  assert.equal(inspectCompiledSemanticPlan(moduleId)?.module_revision, plan.module_revision);
  assert.equal(app.compiledNativeComponentPlan?.module_revision, plan.module_revision);

  const scene = new THREE.Group();
  const domHost = new MemoryVDOMHost();
  const domContainer = domHost.createContainer();
  threeHost = createThreeHost();
  sceneRoot = createNativeRoot(threeHost, scene, {
    rootId: "compiled-admission-scene", renderPreparation: "repeatable", scheduleCommit() {},
  });
  domRoot = createNativeRoot(domHost, domContainer, {
    rootId: "compiled-admission-dom", renderPreparation: "repeatable", scheduleCommit() {},
  });
  const sceneTree = (step) => jsx(app.Scene, { step });
  const domTree = (step) => jsx(app.Dom, { step });
  sceneRoot.mount(sceneTree(1));
  domRoot.mount(domTree(1));
  const group = scene.children[0], mesh = group.children[0], output = domContainer.children[0];
  queue = new NativeRootWorkQueue({ maxStaleRetries: 0 });
  const complete = queue.enqueue({
    id: "compiled-admission-complete", renderPreparation: "repeatable",
    roots: [
      { root: sceneRoot, tree: sceneTree(2) },
      { root: domRoot, tree: domTree(2) },
    ],
  });
  assert.equal(complete.status, "committed", "valid DOM/Three group failed");
  assert.equal(scene.children[0], group);
  assert.equal(group.children[0], mesh);
  assert.equal(mesh.position.x, 2);
  assert.equal(domContainer.children[0], output);
  assert.equal(output.props["data-step"], 2);
  const before = [sceneRoot.publicationVersion, domRoot.publicationVersion];
  const accepted = [sceneRoot.snapshot, domRoot.snapshot];
  const writes = domHost.writeCount;
  let callbacks = 0;
  const stale = queue.enqueue({
    id: "compiled-admission-stale", renderPreparation: "repeatable",
    roots: [
      { root: domRoot, tree: domTree(4) },
      { root: sceneRoot, tree: sceneTree(4) },
    ],
    validateWork: () => {
      if (++callbacks === 3) sceneRoot.dispose();
      return true;
    },
    onStaleWork: () => "reject",
  });
  assert.ok(["stale", "cancelled"].includes(stale.status), "revoked group was accepted");
  assert.equal(domHost.writeCount, writes, "DOM prefix wrote before full admission");
  assert.equal(domRoot.publicationVersion, before[1]);
  assert.equal(domRoot.snapshot, accepted[1]);
  assert.equal(domContainer.children[0], output);
  assert.equal(output.props["data-step"], 2);
  const healthy = queue.enqueue({ id: "compiled-admission-healthy", renderPreparation: "repeatable",
    roots: [{ root: domRoot, tree: domTree(3) }],
  });
  assert.equal(healthy.status, "committed", "prewrite decline quarantined a healthy DOM host");
  assert.equal(domContainer.children[0], output);
  assert.equal(output.props["data-step"], 3);
  assert.equal(scene.children.length, 0, "disposed scene root still owns host children");
  assert.equal(mesh.position.x, 2);
  await writeFile(path.join(directory, "result.json"), JSON.stringify({
    status: "PASS", sceneId, domId, moduleRevision: plan.module_revision,
    callbackCount: callbacks, staleStatus: stale.status,
  }, null, 2) + "\n", { flag: "wx" });
} catch (error) {
  primaryError = error;
} finally {
  for (const dispose of [() => queue?.dispose(), () => sceneRoot?.dispose(),
    () => domRoot?.dispose(), () => threeHost?.dispose(),
    () => plugin.closeBundle?.call(context)]) {
    try { await dispose(); } catch (error) { cleanupErrors.push(error); }
  }
}
if (primaryError || cleanupErrors.length) {
  try {
    await writeFile(path.join(directory, "failure.json"), JSON.stringify({
      status: "FAIL", primaryError: primaryError ? String(primaryError.stack ?? primaryError) : null,
      cleanupErrors: cleanupErrors.map((error) => String(error.stack ?? error)),
    }, null, 2) + "\n", { flag: "wx" });
  } catch (error) { cleanupErrors.push(error); }
}
if (primaryError && cleanupErrors.length) throw new AggregateError(
  [primaryError, ...cleanupErrors], "Compiled group admission and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "Compiled group admission cleanup failed");
console.log(`PASS actual compiled group host admission; provenance: ${directory}`);
