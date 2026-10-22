import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inspect } from "node:util";
import { parse } from "@babel/parser";
import { transformWithOxc } from "vite";
import * as THREE from "three";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { createNativeFrameLoop, createNativeRoot, jsx, storeRecord } from "../src/native_runtime_api.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { invalidateCompiledSemanticPlan } from "../src/compiled_semantic_plan.ts";

const rootPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeUrl = pathToFileURL(path.join(rootPath, "src/native_runtime_api.ts")).href;
const binary = process.env.COMPILER_SPIKE_BINARY ??
  path.join(rootPath, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const artifact = path.join(rootPath, ".cache", `compiled-native-frame-publication-${randomUUID()}`);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const source = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { Suspense, createStore, storeRecord, use, useEffect, useState, jsx } from ${JSON.stringify(runtimeUrl)};
export const clock = createStore(storeRecord({ phase: 0, epoch: 0 }));
export const trace = { childRenders: 0, childSetter: null, clicks: 0 };
export function DomMotion(props) {
  const frame = use(props.clock);
  return <div key="motion" data-phase={frame.phase} data-epoch={frame.epoch}>{props.children}</div>;
}
export function ThreeMotion(props) {
  const frame = use(props.clock);
  return <group key="motion" rotation-y={frame.phase * .125} rotation-z={frame.epoch * .25}>{props.children}</group>;
}
export function Child() {
  trace.childRenders++;
  const [count, setCount] = useState(0);
  useEffect(() => { trace.childSetter = setCount; });
  return <button key="child" data-count={count} onClick={() => trace.clicks++}>child</button>;
}
export function DomApp() {
  return <section key="scene"><DomMotion clock={clock}><Child key="retained" /></DomMotion></section>;
}
export function ThreeApp() {
  return <group key="scene"><ThreeMotion clock={clock}>
    <mesh key="retained"><boxGeometry args={[1,1,1]} /><meshStandardMaterial color="orange" /></mesh>
  </ThreeMotion></group>;
}
export function Independent() {
  const [count, setCount] = useState(0);
  useEffect(() => { trace.independentSetter = setCount; });
  return <output key="independent" data-count={count} />;
}
export function ResourceView(props) {
  const value = use(props.resource);
  return <output key="resource" data-value={value} />;
}
export function ResourceApp(props) {
  return <Suspense fallback={<output key="resource" data-value="waiting" />}>
    <ResourceView key="reader" resource={props.resource} />
  </Suspense>;
}
`;
const property = (node, name) => node?.type === "ObjectExpression" ?
  node.properties.find(entry => entry.type === "ObjectProperty" && !entry.computed &&
    (entry.key.name ?? entry.key.value) === name)?.value ?? null : null;
const literal = node => ["StringLiteral", "NumericLiteral"].includes(node?.type) ? node.value : null;
const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(child => visit(child, callback));
    else if (value && typeof value === "object") visit(value, callback);
  }
};
const locate = (node, predicate) => {
  if (predicate(node)) return node;
  for (const child of node.children ?? []) {
    const found = locate(child, predicate);
    if (found) return found;
  }
  return null;
};
const plugin = nativeModuleCompilerPlugin({ root: rootPath, compilerBinary: binary });
const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
let dom, fork, independent, resourceRoot, three, failed, frame, failedFrame, primaryError;
let registeredSourceFile;
try {
  await mkdir(artifact, { recursive: true });
  const sourcePath = path.join(artifact, "authored.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  const compilerSha256 = sha(await readFile(binary));
  const transformed = await plugin.transform.call(context, source, sourcePath);
  assert.ok(transformed?.code, "actual Rust/OXC transform missing");
  await writeFile(path.join(artifact, "transformed.tsx"), transformed.code, { flag: "wx" });
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const registrations = new Map(), plans = [];
  visit(ast, node => {
    if (node.type === "CallExpression" && node.callee?.name === "__registerNativeSemanticPlan")
      plans.push(node);
    if (node.type !== "CallExpression" || !/^__nativeDefineComponent_*$/.test(node.callee?.name ?? "")) return;
    const id = literal(node.arguments[0]);
    if (id) registrations.set(id.split("#component:").at(-1), { id, metadata: node.arguments[2] });
  });
  assert.equal(plans.length, 1);
  const revision = literal(property(plans[0].arguments[0], "module_revision"));
  registeredSourceFile = literal(property(plans[0].arguments[0], "source_file"));
  assert.match(revision, /^native-v1-[a-f0-9]+$/);
  assert.equal(registeredSourceFile, path.relative(rootPath, sourcePath));
  const proofs = [];
  for (const name of ["DomMotion", "ThreeMotion"]) {
    const registration = registrations.get(name);
    assert.ok(registration, `${name} actual compiled registration missing`);
    const program = property(registration.metadata, "closedStoreHostProgram");
    assert.equal(literal(property(program, "componentProgramId")), registration.id);
    assert.equal(literal(property(program, "retainedChildProp")), "children");
    assert.equal(literal(property(program, "inputs")?.elements?.[0] &&
      property(property(program, "inputs").elements[0], "storeProp")), "clock");
    assert.ok(property(registration.metadata, "closedStoreExecution"),
      `${name} compiled owned Store execution missing`);
    proofs.push({ name, id: registration.id, schemaVersion: literal(property(program, "schemaVersion")) });
  }
  const emitted = await transformWithOxc(transformed.code, sourcePath,
    { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
  const outputPath = path.join(artifact, "compiled.mjs");
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  await writeFile(path.join(artifact, "provenance.json"), JSON.stringify({
    compilerSha256, sourceSha256: sha(source), transformedSha256: sha(transformed.code),
    emittedSha256: sha(emitted.code), proofs,
  }, null, 2) + "\n", { flag: "wx" });
  const app = await import(pathToFileURL(outputPath).href);
  class ObservingHost extends MemoryVDOMHost {
    onWrite;
    fail = false;
    setProp(node, name, value, previous) {
      super.setProp(node, name, value, previous);
      if (name !== "data-phase") return;
      const callback = this.onWrite;
      this.onWrite = undefined;
      callback?.();
      if (this.fail) throw new Error("frame-partial-host-write");
    }
  }
  const host = new ObservingHost(), container = host.createContainer();
  const forkHost = new MemoryVDOMHost(), forkContainer = forkHost.createContainer();
  const otherHost = new MemoryVDOMHost(), otherContainer = otherHost.createContainer();
  const resourceHost = new MemoryVDOMHost(), resourceContainer = resourceHost.createContainer();
  dom = createNativeRoot(host, container,
    { rootId: `frame-dom-${randomUUID()}`, scheduleCommit() {} });
  fork = createNativeRoot(forkHost, forkContainer,
    { rootId: `frame-fork-${randomUUID()}`, scheduleCommit() {} });
  independent = createNativeRoot(otherHost, otherContainer,
    { rootId: `frame-independent-${randomUUID()}`, scheduleCommit() {} });
  resourceRoot = createNativeRoot(resourceHost, resourceContainer,
    { rootId: `frame-resource-${randomUUID()}`, scheduleCommit() {} });
  dom.mount(jsx(app.DomApp, {}));
  fork.mount(jsx(app.DomApp, {}));
  independent.mount(jsx(app.Independent, {}));
  let resolveResource;
  const resource = new Promise(resolve => { resolveResource = resolve; });
  resourceRoot.mount(jsx(app.ResourceApp, { resource }));
  assert.equal(locate(resourceContainer, node => node.props?.["data-value"] === "waiting")?.tag,
    "output", "independent resource did not mount its fallback");
  const scene = new THREE.Scene();
  three = createThreeNativeRoot(scene, { namespace: THREE, rootOptions: {
    rootId: `frame-three-${randomUUID()}`, scheduleCommit() {},
  } });
  three.root.mount(jsx(app.ThreeApp, {}));
  const motion = container.children[0].children[0];
  const child = locate(motion, node => node.tag === "button");
  const forkMotion = forkContainer.children[0].children[0];
  const threeMotion = scene.children[0]?.children[0];
  const mesh = threeMotion?.children[0];
  assert.ok(child && mesh instanceof THREE.Mesh);
  const geometry = mesh.geometry, material = mesh.material;
  const disposal = { geometry: 0, material: 0 };
  geometry.addEventListener("dispose", () => disposal.geometry++);
  material.addEventListener("dispose", () => disposal.material++);
  const originalEvent = child.props.onClick;
  const initialChildRenders = app.trace.childRenders;
  const draws = [], hostOrder = [], updates = [];
  host.onWrite = () => {
    hostOrder.push("dom");
    assert.equal(threeMotion.rotation.y, 0, "later root wrote before DOM host");
    assert.equal(draws.length, 0, "draw entered while grouped host work was applying");
    assert.equal(motion.props["data-phase"], 1);
    assert.equal(JSON.stringify(dom.snapshot), oldDomSnapshot,
      "managed root exposed unaccepted snapshot during host application");
    assert.equal(JSON.stringify(three.root.snapshot), oldThreeSnapshot,
      "other root exposed unaccepted snapshot during host application");
  };
  let oldDomSnapshot = JSON.stringify(dom.snapshot);
  let oldThreeSnapshot = JSON.stringify(three.root.snapshot);
  frame = createNativeFrameLoop({
    roots: [{ root: dom, stores: [app.clock] }, { root: three.root, stores: [app.clock] }],
    update({ timeMs }) {
      updates.push(timeMs);
      app.clock.dispatch(() => storeRecord({ phase: timeMs, epoch: 1 }));
    },
    draw(time) {
      assert.ok(Object.isFrozen(time));
      assert.equal(motion.props["data-phase"], time.timeMs);
      assert.equal(threeMotion.rotation.y, time.timeMs * .125);
      draws.push({ timeMs: time.timeMs, versions: [dom.publicationVersion, three.root.publicationVersion] });
    },
  });
  assert.equal(frame.running, false);
  const before = [dom.publicationVersion, three.root.publicationVersion];
  const first = frame.advance(1);
  assert.equal(first.status, "drawn");
  assert.deepEqual(hostOrder, ["dom"]);
  assert.deepEqual(draws.map(item => item.timeMs), [1]);
  assert.deepEqual([dom.publicationVersion, three.root.publicationVersion],
    before.map(version => version + 1));
  assert.equal(motion.props["data-phase"], 1);
  assert.equal(threeMotion.rotation.y, .125);
  assert.equal(forkMotion.props["data-phase"], 0,
    "unselected fork accepted another root's Store history");
  assert.strictEqual(motion.children[0], child);
  assert.strictEqual(child.props.onClick, originalEvent);
  assert.strictEqual(mesh.geometry, geometry);
  assert.strictEqual(mesh.material, material);
  assert.equal(app.trace.childRenders, initialChildRenders,
    "closed frame rerendered retained child owners");
  app.trace.independentSetter(7);
  assert.equal(independent.flush(), true, "unrelated DOM work starved behind frame cadence");
  assert.equal(otherContainer.children[0].props["data-count"], 7);
  resolveResource("ready");
  for (let turn = 0; turn < 8; turn++) {
    await new Promise(resolve => setTimeout(resolve, 0));
    resourceRoot.flush();
    if (locate(resourceContainer, node => node.props?.["data-value"] === "ready")) break;
  }
  assert.equal(locate(resourceContainer, node => node.props?.["data-value"] === "ready")?.tag,
    "output", "independent resource failed to reveal while frame controller remained active");
  host.onWrite = () => app.clock.dispatch(() => storeRecord({ phase: 3, epoch: 2 }));
  const second = frame.advance(2);
  assert.equal(second.status, "drawn", `grouped host-time publication failed: ${inspect({
    error: second.error, publication: second.publication,
  }, { depth: 8 })}`);
  assert.equal(motion.props["data-phase"], 2,
    "newer host-time dispatch entered the accepted frame");
  assert.equal(app.clock.getState().phase, 3);
  assert.equal(threeMotion.rotation.y, .25);
  assert.equal(dom.flush(), true, "newer host-time dispatch lost its pending root action");
  assert.equal(motion.props["data-phase"], 3);
  assert.equal(threeMotion.rotation.y, .25,
    "independent DOM acceptance changed the Three reader history");
  assert.equal(frame.advance(4).status, "drawn");
  assert.equal(motion.props["data-phase"], 4);
  assert.equal(threeMotion.rotation.y, .5);
  assert.equal(forkMotion.props["data-phase"], 0);
  assert.equal(fork.flush(), true);
  assert.equal(forkMotion.props["data-phase"], 4,
    "fork did not independently accept latest Store state");

  let pendingInWriter;
  host.onWrite = () => { pendingInWriter = frame.advance(7); };
  app.clock.dispatch(() => storeRecord({ phase: 6, epoch: 3 }));
  const drawsBeforePending = draws.length;
  assert.equal(dom.flush(), true, "outer DOM publication did not release its host");
  assert.equal(pendingInWriter?.status, "pending",
    "frame work entered a busy participant host");
  assert.equal(draws.length, drawsBeforePending,
    "host wake drew outside an explicit frame advance");
  for (let turn = 0; turn < 8 && motion.props["data-phase"] !== 7; turn++)
    await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(motion.props["data-phase"], 7,
    "busy-host completion did not settle outside RAF");
  assert.equal(threeMotion.rotation.y, .875);
  const acceptedBeforeLocal = dom.publicationVersion;
  assert.equal(app.trace.childSetter(1), true);
  assert.equal(dom.flush(), true);
  assert.ok(dom.publicationVersion > acceptedBeforeLocal,
    "intervening local publication did not advance the selected root");
  assert.equal(frame.advance(8).status, "drawn");
  assert.deepEqual(updates, [1, 2, 4, 7],
    "delayed frame update reran while checking accepted root currentness");
  assert.equal(draws.at(-1).timeMs, 7,
    "delayed draw used a newer RAF time instead of its requested frame time");
  assert.equal(motion.props["data-phase"], 7);
  assert.equal(threeMotion.rotation.y, .875);

  const failingHost = new ObservingHost(), failingContainer = failingHost.createContainer();
  failed = createNativeRoot(failingHost, failingContainer,
    { rootId: `frame-failed-${randomUUID()}`, scheduleCommit() {} });
  failed.mount(jsx(app.DomApp, {}));
  const failedSnapshot = JSON.stringify(failed.snapshot);
  const failedVersion = failed.publicationVersion;
  const failedDraws = [];
  failingHost.fail = true;
  failedFrame = createNativeFrameLoop({
    roots: [{ root: failed, stores: [app.clock] }],
    update() { app.clock.dispatch(() => storeRecord({ phase: 5, epoch: 3 })); },
    draw() { failedDraws.push("draw"); },
  });
  const failure = failedFrame.advance(5);
  assert.equal(failure.status, "failed");
  assert.equal(failedDraws.length, 0, "failed frame reached draw");
  assert.equal(failed.publicationVersion, failedVersion);
  assert.equal(JSON.stringify(failed.snapshot), failedSnapshot,
    "partial writer advanced accepted history");
  assert.throws(() => failed.flush(), /host|failed|quarantined/i,
    "quarantined host replayed unknown partial work");

  const drawsBeforeRetirement = draws.length;
  assert.equal(invalidateCompiledSemanticPlan(registeredSourceFile, revision), true);
  assert.equal(dom.retired, true);
  assert.equal(three.root.retired, true);
  assert.notEqual(frame.advance(9).status, "drawn",
    "retired compiled frame participants still drew");
  assert.equal(draws.length, drawsBeforeRetirement);

  failedFrame.dispose(); failedFrame = null;
  frame.dispose(); frame = null;
  dom.dispose(); dom = null;
  fork.dispose(); fork = null;
  independent.dispose(); independent = null;
  resourceRoot.dispose(); resourceRoot = null;
  failed.dispose(); failed = null;
  three.dispose();
  assert.deepEqual(disposal, { geometry: 1, material: 1 });
  assert.equal(three.host.diagnostics.liveResources, 0);
  three = null;
  assert.deepEqual([container.children.length, forkContainer.children.length,
    otherContainer.children.length, resourceContainer.children.length,
    failingContainer.children.length, scene.children.length],
    [0, 0, 0, 0, 0, 0]);
  await writeFile(path.join(artifact, "result.json"), JSON.stringify({ status: "PASS", proofs,
    assertions: { actualCompiledStorePrograms: true, explicitDomThreeGroup: true,
      retainedChildAndThreeResources: true, managedOldSnapshots: true,
      independentDomAndResourceProgress: true, newerHostAction: true, forkHistory: true,
      partialFailureQuarantine: true, codeRetirement: true, exactResourceDisposal: true },
    boundary: "No timing, presentation, or independent-device claim.",
  }, null, 2) + "\n", { flag: "wx" });
  console.log(`PASS compiled native frame publication; provenance: ${artifact}`);
} catch (error) { primaryError = error; }
const cleanupErrors = [];
for (const dispose of [() => failedFrame?.dispose(), () => frame?.dispose(),
  () => dom?.dispose(), () => fork?.dispose(), () => independent?.dispose(),
  () => resourceRoot?.dispose(), () => failed?.dispose(), () => three?.dispose(),
  () => registeredSourceFile && invalidateCompiledSemanticPlan(registeredSourceFile),
  () => plugin.closeBundle()]) {
  try { await dispose(); } catch (error) { cleanupErrors.push(error); }
}
if (primaryError && cleanupErrors.length) throw new AggregateError([primaryError, ...cleanupErrors],
  "Compiled native frame fixture and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanupErrors.length) throw new AggregateError(cleanupErrors,
  "Compiled native frame cleanup failed");
