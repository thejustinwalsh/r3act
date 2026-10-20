import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as THREE from "three";
import { transformWithOxc } from "vite";
import { nativeModulePlugin } from "./vite_native_plugin.ts";
import { createNativeRoot, inspectCompiledSemanticPlan, jsx, NativeRootWorkQueue } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { createThreeHost } from "../src/three_host.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.join(projectRoot, ".cache", `compiled-host-domain-${randomUUID()}`);
const runtimePath = path.join(projectRoot, "src/native_runtime_api.ts");
const runtimeUrl = pathToFileURL(runtimePath).href;
const authored = `import { jsx } from ${JSON.stringify(runtimeUrl)};
export const trace = { sceneBodies: [], domBodies: [] };
export function Scene(props) {
  trace.sceneBodies.push(props.label + ":" + props.step);
  return <group key="root" name={props.label}>
    <mesh key="mesh" position-x={props.step} domainProbe={props.step} />
  </group>;
}
export function Dom(props) {
  trace.domBodies.push(props.step);
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
const drain = async () => {
  for (let index = 0; index < 5; index++) await Promise.resolve();
};
let host, first, second, dom, independent, queuedDom, firstQueue, secondQueue;
let primaryError;
const cleanupErrors = [];
try {
  await mkdir(directory, { recursive: true });
  const sourcePath = path.join(directory, "domain.tsx");
  await writeFile(sourcePath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, sourcePath);
  assert.ok(transformed?.code && transformed.code !== authored, "Rust/OXC transform missing");
  await writeFile(path.join(directory, "domain.transformed.tsx"), transformed.code, { flag: "wx" });
  const sceneId = transformed.code.match(/__nativeDefineComponent\(\s*"([^"]*#component:Scene)"/)?.[1];
  const domId = transformed.code.match(/__nativeDefineComponent\(\s*"([^"]*#component:Dom)"/)?.[1];
  const semanticRegistration = transformed.code.match(/__registerNativeSemanticPlan\((\{[\s\S]*?\})\);/);
  assert.ok(sceneId && domId && semanticRegistration, "compiled owner IDs or semantic plan missing");
  const emittedPlan = JSON.parse(semanticRegistration[1]);
  assert.equal(emittedPlan.schema_version, 1);
  assert.equal(emittedPlan.source_file, path.relative(projectRoot, sourcePath));
  assert.deepEqual(new Set(emittedPlan.owners.map((owner) => owner.site_id)), new Set([sceneId, domId]));
  assert.match(emittedPlan.module_revision, /^native-v1-[a-f0-9]+$/);
  const emitted = await transformWithOxc(transformed.code, sourcePath, {
    lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" },
  });
  const outputPath = path.join(directory, "domain.emitted.mjs");
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  const app = await import(`${pathToFileURL(outputPath).href}?run=${randomUUID()}`);
  const moduleId = sceneId.slice(0, sceneId.lastIndexOf("#component:"));
  assert.equal(inspectCompiledSemanticPlan(moduleId)?.module_revision, emittedPlan.module_revision);
  assert.equal(app.compiledNativeComponentPlan?.module_revision, emittedPlan.module_revision);

  const firstScene = new THREE.Group(), secondScene = new THREE.Group();
  const domHost = new MemoryVDOMHost(), domContainer = domHost.createContainer();
  const otherHost = new MemoryVDOMHost(), otherContainer = otherHost.createContainer();
  const queuedHost = new MemoryVDOMHost(), queuedContainer = queuedHost.createContainer();
  let callbackRan = false;
  let nestedWriters = 0;
  let writerDepth = 0;
  let pendingAtCallback = null;
  let secondWork;
  let throwAt99 = false;
  let acceptedBeforeOuter;
  host = createThreeHost({ propertyWriters: {
    domainProbe(_handle, value) {
      writerDepth++;
      if (writerDepth > 1) nestedWriters++;
      try {
        if (!callbackRan && value === 2) {
          callbackRan = true;
          const before = second.publicationVersion;
          const bodies = app.trace.sceneBodies.length;
          const domBodies = app.trace.domBodies.length;
          secondWork = secondQueue.enqueue({ id: `second-${randomUUID()}`,
            renderPreparation: "repeatable",
            roots: [
              { root: second, tree: jsx(app.Scene, { label: "second", step: 3 }) },
              { root: queuedDom, tree: jsx(app.Dom, { step: 3 }) },
            ],
          });
          pendingAtCallback = secondWork.status;
          assert.equal(secondWork.status, "pending", "busy host work failed or committed reentrantly");
          assert.equal(second.publicationVersion, before, "busy second root advanced accepted view");
          assert.equal(app.trace.sceneBodies.length, bodies, "busy work invoked compiled body");
          assert.equal(app.trace.domBodies.length, domBodies,
            "busy group invoked an available DOM body before all-domain admission");
          assert.deepEqual([JSON.stringify(first.snapshot), JSON.stringify(dom.snapshot)],
            acceptedBeforeOuter, "managed accepted snapshots advanced inside host writer");
          assert.equal(queuedContainer.children[0].props["data-step"], 1,
            "multi-host group partially wrote an available DOM host before claiming Three");
          independent.update(jsx(app.Dom, { step: 7 }));
          assert.equal(otherContainer.children[0].props["data-step"], 7,
            "distinct host did not progress during shared-host application");
        }
        if (throwAt99 && value === 99) throw new Error("compiled-domain-writer-failed");
      } finally {
        writerDepth--;
      }
    },
  } });
  first = createNativeRoot(host, firstScene,
    { rootId: "compiled-domain-first", renderPreparation: "repeatable", scheduleCommit() {} });
  second = createNativeRoot(host, secondScene,
    { rootId: "compiled-domain-second", renderPreparation: "repeatable", scheduleCommit() {} });
  dom = createNativeRoot(domHost, domContainer,
    { rootId: "compiled-domain-dom", renderPreparation: "repeatable", scheduleCommit() {} });
  independent = createNativeRoot(otherHost, otherContainer,
    { rootId: "compiled-domain-independent", renderPreparation: "repeatable", scheduleCommit() {} });
  queuedDom = createNativeRoot(queuedHost, queuedContainer,
    { rootId: "compiled-domain-queued-dom", renderPreparation: "repeatable", scheduleCommit() {} });
  const sceneTree = (label, step) => jsx(app.Scene, { label, step });
  first.mount(sceneTree("first", 1));
  second.mount(sceneTree("second", 1));
  dom.mount(jsx(app.Dom, { step: 1 }));
  independent.mount(jsx(app.Dom, { step: 1 }));
  queuedDom.mount(jsx(app.Dom, { step: 1 }));
  const firstGroup = firstScene.children[0], secondGroup = secondScene.children[0];
  const firstMesh = firstGroup.children[0], secondMesh = secondGroup.children[0];
  firstQueue = new NativeRootWorkQueue();
  secondQueue = new NativeRootWorkQueue();
  acceptedBeforeOuter = [JSON.stringify(first.snapshot), JSON.stringify(dom.snapshot)];
  const versions = [first.publicationVersion, dom.publicationVersion];
  const outer = firstQueue.enqueue({ id: `first-${randomUUID()}`,
    renderPreparation: "repeatable",
    roots: [
      { root: first, tree: sceneTree("first", 2) },
      { root: dom, tree: jsx(app.Dom, { step: 2 }) },
    ],
  });
  assert.equal(outer.status, "committed", "DOM/Three group did not commit");
  await drain();
  assert.equal(callbackRan, true, "compiled writer did not exercise queue reentry");
  assert.equal(pendingAtCallback, "pending");
  assert.equal(secondWork.status, "committed", "busy second queue did not wake after release");
  assert.equal(queuedContainer.children[0].props["data-step"], 3,
    "available DOM member of busy group did not publish with Three");
  assert.equal(nestedWriters, 0, "same-host writes nested across queues");
  assert.deepEqual([first.publicationVersion, dom.publicationVersion],
    versions.map((version) => version + 1));
  assert.equal(firstScene.children[0], firstGroup, "first keyed group replaced");
  assert.equal(secondScene.children[0], secondGroup, "second keyed group replaced");
  assert.equal(firstGroup.children[0], firstMesh, "first Three mesh replaced");
  assert.equal(secondGroup.children[0], secondMesh, "second Three mesh replaced");
  assert.deepEqual([firstMesh.position.x, secondMesh.position.x], [2, 3]);
  assert.equal(domContainer.children[0].props["data-step"], 2);

  const sharedBefore = [first.publicationVersion, second.publicationVersion, dom.publicationVersion];
  const sameHostGroup = firstQueue.enqueue({ id: `same-host-group-${randomUUID()}`,
    renderPreparation: "repeatable",
    roots: [
      { root: first, tree: sceneTree("first", 4) },
      { root: second, tree: sceneTree("second", 4) },
      { root: dom, tree: jsx(app.Dom, { step: 4 }) },
    ],
  });
  assert.equal(sameHostGroup.status, "committed", "two roots on one Three host deadlocked their group");
  assert.deepEqual([first.publicationVersion, second.publicationVersion, dom.publicationVersion],
    sharedBefore.map((version) => version + 1), "same-host group did not publish each root once");
  assert.deepEqual([firstMesh.position.x, secondMesh.position.x], [4, 4]);
  assert.equal(domContainer.children[0].props["data-step"], 4);
  assert.equal(firstScene.children[0], firstGroup);
  assert.equal(secondScene.children[0], secondGroup);
  assert.equal(nestedWriters, 0, "same-host group nested writers");

  const accepted = [first.publicationVersion, second.publicationVersion];
  const snapshots = [JSON.stringify(first.snapshot), JSON.stringify(second.snapshot)];
  throwAt99 = true;
  const failed = firstQueue.enqueue({ id: `failed-${randomUUID()}`,
    renderPreparation: "repeatable",
    roots: [{ root: first, tree: sceneTree("first", 99) }],
  });
  assert.equal(failed.status, "failed", "partial Three host failure did not fail work");
  assert.match(String(failed.resolution?.error), /compiled-domain-writer-failed/);
  assert.deepEqual([first.publicationVersion, second.publicationVersion], accepted,
    "failed host advanced an accepted frontier");
  assert.deepEqual([JSON.stringify(first.snapshot), JSON.stringify(second.snapshot)], snapshots,
    "failed host changed managed accepted snapshots");
  assert.throws(() => second.update(sceneTree("second", 4)), /terminal|failed|failure|quarantin/i,
    "sibling published into the quarantined Three host");
  const freshHost = createThreeHost();
  const freshScene = new THREE.Group();
  const recovered = createNativeRoot(freshHost, freshScene,
    { rootId: "compiled-domain-recovery", scheduleCommit() {} });
  try {
    recovered.mount(sceneTree("recovered", 1));
    recovered.update(sceneTree("recovered", 4));
    assert.equal(freshScene.children[0].children[0].position.x, 4,
      "fresh Three host could not recover");
  } finally {
    recovered.dispose();
    freshHost.dispose();
  }
  await writeFile(path.join(directory, "result.json"), JSON.stringify({ status: "PASS",
    sceneId, domId, moduleRevision: emittedPlan.module_revision,
    pendingAtCallback, nestedWriters, accepted,
  }, null, 2) + "\n", { flag: "wx" });
} catch (error) {
  primaryError = error;
} finally {
  for (const dispose of [() => firstQueue?.dispose(), () => secondQueue?.dispose(),
    () => first?.dispose(), () => second?.dispose(), () => dom?.dispose(),
    () => independent?.dispose(), () => queuedDom?.dispose(), () => host?.dispose(),
    () => plugin.closeBundle?.call(context)]) {
    try { await dispose(); } catch (error) { cleanupErrors.push(error); }
  }
}
if (primaryError || cleanupErrors.length) {
  try {
    await writeFile(path.join(directory, "failure.json"), JSON.stringify({ status: "FAIL",
      primaryError: primaryError ? String(primaryError.stack ?? primaryError) : null,
      cleanupErrors: cleanupErrors.map((error) => String(error.stack ?? error)),
    }, null, 2) + "\n", { flag: "wx" });
  } catch (error) { cleanupErrors.push(error); }
}
if (primaryError && cleanupErrors.length) throw new AggregateError(
  [primaryError, ...cleanupErrors], "Compiled host domain and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors, "Compiled host domain cleanup failed");
console.log(`PASS actual compiled host publication domain; provenance: ${directory}`);
