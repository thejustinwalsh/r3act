import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transformWithOxc } from "vite";
import * as THREE from "three";
import { nativeModulePlugin } from "./vite_native_plugin.ts";
import { createNativeRoot, inspectCompiledSemanticPlan, jsx, NativeRootWorkQueue } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { createThreeHost } from "../src/three_host.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.join(projectRoot, ".cache", `compiled-three-lifetime-${randomUUID()}`);
const runtimeUrl = pathToFileURL(path.join(projectRoot, "src/native_runtime_api.ts")).href;
const authored = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { jsx } from ${JSON.stringify(runtimeUrl)};
export function Scene(props) {
  return <group key="group" name={props.label}>
    <mesh key="main" position-x={props.phase} failPhase={props.phase}>
      {props.show ? <sharedGeometry key="geometry" /> : null}
      {props.show ? <sharedMaterial key="material" /> : null}
    </mesh>
    <mesh key="borrowed"><primitive key="borrowed-geometry" object={props.borrowed} attach="geometry" /></mesh>
  </group>;
}
export function Dom(props) { return <output key="status" data-phase={props.phase}>phase:{props.phase}</output>; }
`;
const plugin = nativeModulePlugin({ root: projectRoot,
  compilerBinary: path.join(projectRoot, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike") });
plugin.configResolved?.call({}, { root: projectRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    return specifier === runtimeUrl
      ? { id: path.join(projectRoot, "src/native_runtime_api.ts") }
      : null;
  },
  error(message) { throw new Error(String(message)); },
};
let queue, host, first, second, dom;
let primaryError;
const cleanupErrors = [];
try {
  await mkdir(directory, { recursive: true });
  const sourcePath = path.join(directory, "scene.tsx");
  await writeFile(sourcePath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, sourcePath);
  assert.ok(transformed?.code && transformed.code !== authored, "Rust/OXC did not compile authored TSX");
  await writeFile(path.join(directory, "scene.transformed.tsx"), transformed.code, { flag: "wx" });
  const sceneRegistration = transformed.code.match(/__nativeDefineComponent\(\s*"([^"]*#component:Scene)"/);
  const domRegistration = transformed.code.match(/__nativeDefineComponent\(\s*"([^"]*#component:Dom)"/);
  const semanticRegistration = transformed.code.match(/__registerNativeSemanticPlan\((\{[\s\S]*?\})\);/);
  assert.ok(sceneRegistration && domRegistration && semanticRegistration,
    "Rust/OXC component IDs and semantic registration are missing");
  const emittedPlan = JSON.parse(semanticRegistration[1]);
  assert.equal(emittedPlan.schema_version, 1, "unexpected emitted semantic ABI");
  assert.equal(emittedPlan.source_file, path.relative(projectRoot, sourcePath),
    "semantic plan source identity differs from compiled fixture");
  assert.match(emittedPlan.module_revision, /^native-v1-[a-f0-9]+$/,
    "emitted semantic revision is missing");
  assert.deepEqual(new Set(emittedPlan.owners.map((owner) => owner.site_id)),
    new Set([sceneRegistration[1], domRegistration[1]]),
    "semantic owners differ from lowered component registrations");
  assert.notEqual(sceneRegistration[1], domRegistration[1], "Scene and Dom reused one owner ID");
  const emitted = await transformWithOxc(transformed.code, sourcePath, {
    lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" },
  });
  const outputPath = path.join(directory, "scene.mjs");
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  const app = await import(`${pathToFileURL(outputPath).href}?run=${randomUUID()}`);
  const moduleId = sceneRegistration[1].slice(0, sceneRegistration[1].lastIndexOf("#component:"));
  assert.equal(inspectCompiledSemanticPlan(moduleId)?.module_revision, emittedPlan.module_revision,
    "registered semantic plan does not match the emitted component revision");
  assert.equal(app.compiledNativeComponentPlan?.module_revision, emittedPlan.module_revision,
    "exported compiler plan revision differs from runtime registration");

  const sharedGeometry = new THREE.BufferGeometry();
  const sharedMaterial = new THREE.MeshBasicMaterial();
  const borrowed = new THREE.BufferGeometry();
  const disposal = { geometry: 0, material: 0, borrowed: 0 };
  sharedGeometry.addEventListener("dispose", () => disposal.geometry++);
  sharedMaterial.addEventListener("dispose", () => disposal.material++);
  borrowed.addEventListener("dispose", () => disposal.borrowed++);
  let fail = false;
  host = createThreeHost({
    registry: {
      sharedGeometry: () => sharedGeometry,
      sharedMaterial: () => sharedMaterial,
    },
    propertyWriters: {
      failPhase(_handle, value) {
        if (fail && value === 99) throw new Error("three-phase-writer-failed");
      },
    },
  });
  const firstScene = new THREE.Group(), secondScene = new THREE.Group();
  first = createNativeRoot(host, firstScene,
    { rootId: "compiled-three-lifetime-first", renderPreparation: "repeatable", scheduleCommit() {} });
  second = createNativeRoot(host, secondScene,
    { rootId: "compiled-three-lifetime-second", renderPreparation: "repeatable", scheduleCommit() {} });
  const domHost = new MemoryVDOMHost(), domContainer = domHost.createContainer();
  dom = createNativeRoot(domHost, domContainer,
    { rootId: "compiled-three-lifetime-dom", renderPreparation: "repeatable", scheduleCommit() {} });
  const sceneTree = (label, phase, show = true) => jsx(app.Scene, { label, phase, show, borrowed });
  const domTree = (phase) => jsx(app.Dom, { phase });
  first.mount(sceneTree("first", 1));
  second.mount(sceneTree("second", 1));
  dom.mount(domTree(1));
  const firstGroup = firstScene.children[0], secondGroup = secondScene.children[0];
  const firstMesh = firstGroup.children[0], secondMesh = secondGroup.children[0];
  const domOutput = domContainer.children[0];
  assert.equal(firstMesh.geometry, sharedGeometry);
  assert.equal(secondMesh.geometry, sharedGeometry);
  assert.equal(firstMesh.material, sharedMaterial);
  assert.equal(secondMesh.material, sharedMaterial);
  assert.equal(host.diagnostics.createdResources, 2, "two unique factory-owned resources");

  queue = new NativeRootWorkQueue();
  const versions = [first.publicationVersion, second.publicationVersion, dom.publicationVersion];
  const update = queue.enqueue({ id: `three-lifetime-update-${randomUUID()}`,
    renderPreparation: "repeatable",
    roots: [
      { root: first, tree: sceneTree("first", 2) },
      { root: second, tree: sceneTree("second", 2) },
      { root: dom, tree: domTree(2) },
    ],
  });
  assert.equal(update.status, "committed", "grouped DOM/Three update did not publish");
  assert.deepEqual([first.publicationVersion, second.publicationVersion, dom.publicationVersion],
    versions.map((version) => version + 1), "grouped accepted frontier did not advance once");
  assert.equal(firstScene.children[0], firstGroup, "first scene identity changed");
  assert.equal(secondScene.children[0], secondGroup, "second scene identity changed");
  assert.equal(firstGroup.children[0], firstMesh, "first mesh identity changed");
  assert.equal(secondGroup.children[0], secondMesh, "second mesh identity changed");
  assert.equal(domContainer.children[0], domOutput, "DOM host identity changed");
  assert.equal(domOutput.props["data-phase"], 2);
  assert.deepEqual([firstMesh.position.x, secondMesh.position.x], [2, 2]);
  assert.deepEqual(disposal, { geometry: 0, material: 0, borrowed: 0 });

  first.update(sceneTree("first", 3, false));
  assert.deepEqual(disposal, { geometry: 0, material: 0, borrowed: 0 },
    "keyed removal disposed a resource still used by the second root");
  assert.equal(host.diagnostics.liveResources, 2);
  first.dispose();
  first = undefined;
  assert.deepEqual(disposal, { geometry: 0, material: 0, borrowed: 0 },
    "first root teardown disposed shared or borrowed assets");
  assert.equal(secondScene.children[0], secondGroup);
  assert.equal(secondMesh.geometry, sharedGeometry);
  assert.equal(secondMesh.material, sharedMaterial);

  const accepted = [second.publicationVersion, dom.publicationVersion];
  const snapshots = [JSON.stringify(second.snapshot), JSON.stringify(dom.snapshot)];
  fail = true;
  const failed = queue.enqueue({ id: `three-lifetime-failure-${randomUUID()}`,
    renderPreparation: "repeatable",
    roots: [
      { root: dom, tree: domTree(99) },
      { root: second, tree: sceneTree("second", 99) },
    ],
  });
  assert.equal(failed.status, "failed", "throwing Three writer did not fail the group");
  assert.match(String(failed.resolution?.error), /three-phase-writer-failed/);
  assert.deepEqual([second.publicationVersion, dom.publicationVersion], accepted,
    "failed host group advanced accepted publication versions");
  assert.deepEqual([JSON.stringify(second.snapshot), JSON.stringify(dom.snapshot)], snapshots,
    "failed host group advanced accepted snapshots");
  assert.throws(() => second.flush(), /terminal|failed|quarantin/i,
    "failed Three root accepted later publication");
  fail = false;
  second.dispose();
  second = undefined;
  assert.deepEqual(disposal, { geometry: 1, material: 1, borrowed: 0 },
    "final live Three root must release each owned resource once");
  dom.dispose();
  dom = undefined;
  host.dispose();
  assert.equal(host.diagnostics.liveHandles, 0);
  assert.equal(host.diagnostics.liveResources, 0);
  assert.equal(host.diagnostics.eventRegistrations, 0);
  assert.deepEqual(disposal, { geometry: 1, material: 1, borrowed: 0 });
  borrowed.dispose();
  await writeFile(path.join(directory, "result.json"), JSON.stringify({
    status: "PASS", sceneOwnerId: sceneRegistration[1], domOwnerId: domRegistration[1],
    moduleRevision: emittedPlan.module_revision, disposal, diagnostics: host.diagnostics,
  }, null, 2) + "\n", { flag: "wx" });
} catch (error) {
  primaryError = error;
} finally {
  for (const dispose of [() => queue?.dispose(), () => first?.dispose(),
    () => second?.dispose(), () => dom?.dispose(), () => host?.dispose(),
    () => plugin.closeBundle?.call(context)]) {
    try { await dispose(); } catch (error) { cleanupErrors.push(error); }
  }
}
if (primaryError || cleanupErrors.length) {
  await writeFile(path.join(directory, "failure.json"), JSON.stringify({
    status: "FAIL",
    primaryError: primaryError ? String(primaryError.stack ?? primaryError) : null,
    cleanupErrors: cleanupErrors.map((error) => String(error.stack ?? error)),
  }, null, 2) + "\n", { flag: "wx" });
}
if (primaryError && cleanupErrors.length) throw new AggregateError(
  [primaryError, ...cleanupErrors], "Compiled Three resource lifetime and cleanup failed",
  { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors,
  "Compiled Three resource lifetime cleanup failed");
console.log(`PASS actual compiled Three resource lifetime; provenance: ${directory}`);
