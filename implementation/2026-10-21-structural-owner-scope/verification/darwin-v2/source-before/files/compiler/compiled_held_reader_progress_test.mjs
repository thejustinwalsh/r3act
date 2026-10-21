import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { transformWithOxc } from "vite";
import * as THREE from "three";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { AsyncResource, createNativeRoot, createStore, jsx, NativeRootWorkQueue,
  storeRecord, OwnerStateWorld } from "../src/native_runtime_api.ts";
import { invalidateCompiledSemanticPlan } from "../src/compiled_semantic_plan.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const compilerBinary = path.join(projectRoot, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const fixture = path.join(projectRoot, "compiler/fixtures/native-held-reader-progress.tsx");
const directory = path.join(projectRoot, ".cache", `compiled-held-reader-${randomUUID()}`);
const source = (await readFile(fixture, "utf8")).replace('"native_runtime_api.ts"',
  JSON.stringify(pathToFileURL(path.join(projectRoot, "src/native_runtime_api.ts")).href));
const property = (node, name) => node?.type === "ObjectExpression" ?
  (node.properties.find((entry) => entry.type === "ObjectProperty" && !entry.computed &&
    (entry.key.name ?? entry.key.value) === name)?.value ?? null) : null;
const literal = (node) => ["StringLiteral", "NumericLiteral"].includes(node?.type) ? node.value : null;
const value = (node) => {
  if (node?.type === "ArrayExpression") return node.elements.map(value);
  if (node?.type === "ObjectExpression") return Object.fromEntries(node.properties.map((entry) =>
    [entry.key.name ?? entry.key.value, value(entry.value)]));
  return literal(node);
};
const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [key, child] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
    if (Array.isArray(child)) child.forEach((item) => visit(item, callback));
    else if (child && typeof child === "object") visit(child, callback);
  }
};
const find = (node, predicate) => predicate(node) ? node :
  (node.children ?? []).map((child) => find(child, predicate)).find(Boolean);
const heldState = (x, y) => storeRecord({ vector: storeRecord({ x, y }) });
const sample = (x, y) => storeRecord({ sample: storeRecord({ x, y }) });
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const plugin = nativeModuleCompilerPlugin({ root: projectRoot, compilerBinary });
const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
let dom, fork, three, choiceRoot, choiceQueue, localRoot, localQueue, positiveRoot, positiveQueue, queue;
let sourcePath, primaryError, executionProof, app, choiceA, choiceB, localA, positiveA;
try {
  await mkdir(directory, { recursive: true });
  sourcePath = path.join(directory, "held-reader-progress.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  const compilerSha256 = createHash("sha256").update(await readFile(compilerBinary)).digest("hex");
  const transformed = await plugin.transform.call(context, source, sourcePath);
  assert.ok(transformed?.code, "Rust/OXC transform did not produce a module");
  await writeFile(path.join(directory, "held-reader-progress.transformed.tsx"), transformed.code,
    { flag: "wx" });
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const aliases = new Map();
  for (const statement of ast.program.body) {
    if (statement.type !== "ImportDeclaration") continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type === "ImportSpecifier") aliases.set(
        specifier.imported.name ?? specifier.imported.value, specifier.local.name);
    }
  }
  assert.ok(aliases.get("useAt"));
  const plans = [];
  visit(ast, (node) => {
    if (node.type === "CallExpression" && node.callee.name === "__registerNativeSemanticPlan")
      plans.push(node);
  });
  assert.equal(plans.length, 1);
  const revision = literal(property(plans[0].arguments[0], "module_revision"));
  assert.match(revision, /^native-v1-[a-f0-9]+$/);
  const proofs = [];
  for (const name of ["HeldDom", "HeldThree"]) {
    const definitions = [];
    visit(ast, (node) => {
      if (node.type === "CallExpression" && node.callee.name === aliases.get("defineComponent") &&
        literal(node.arguments[0])?.endsWith(`#component:${name}`)) definitions.push(node);
    });
    assert.equal(definitions.length, 1, `${name} compiled owner missing`);
    const id = literal(definitions[0].arguments[0]);
    const metadata = definitions[0].arguments[2];
    const program = property(metadata, "closedStoreHostProgram");
    assert.equal(literal(property(program, "schemaVersion")), 5);
    assert.equal(literal(property(program, "componentProgramId")), id);
    assert.equal(literal(property(program, "moduleRevision")), revision);
    assert.equal(property(metadata, "closedResourceHostProgram"), null);
    const inputs = value(property(program, "inputs"));
    assert.deepEqual(inputs.map((input) => [input.storeUseSiteId, input.storeProp]), [
      [`${id}#store:0`, "heldA"], [`${id}#store:1`, "resource"],
    ]);
    assert.deepEqual(inputs.map((input) => input.paths), name === "HeldDom" ? [
      [["vector", "x"], ["vector", "y"]], [["sample", "x"], ["sample", "y"]],
    ] : [
      [["vector", "x"], ["vector", "y"]], [["sample", "x"], ["sample", "y"]],
    ]);
    proofs.push({ name, id, schemaVersion: 5, inputs, host: value(property(program, "host")) });
  }
  for (const name of ["ControlledChoice", "LocalChoice"]) {
    const choice = [];
    visit(ast, (node) => {
      if (node.type === "CallExpression" && node.callee.name === aliases.get("defineComponent") &&
        literal(node.arguments[0])?.endsWith(`#component:${name}`)) choice.push(node);
    });
    assert.equal(choice.length, 1);
    assert.equal(property(choice[0].arguments[2], "closedStoreHostProgram"), null,
      `${name} dynamic branch must retain generic admission`);
  }
  await writeFile(path.join(directory, "compiler-proof.json"), JSON.stringify({
    compilerSha256, sourceSha256: createHash("sha256").update(source).digest("hex"),
    revision, proofs, storeControlBranch: "generic", localControlBranch: "generic",
  }, null, 2) + "\n", { flag: "wx" });
  const emitted = await transformWithOxc(transformed.code, sourcePath, {
    lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" },
  });
  const outputPath = path.join(directory, "held-reader-progress.mjs");
  await writeFile(outputPath, emitted.code, { flag: "wx" });
  app = await import(pathToFileURL(outputPath).href);
  const world = new OwnerStateWorld();
  const scheduled = [];
  const scheduleCommit = (commit) => scheduled.push(commit);
  const drain = (limit = 24) => {
    for (let turn = 0; turn < limit && scheduled.length; turn++) scheduled.shift()();
    assert.equal(scheduled.length, 0, "scheduled work did not quiesce");
  };
  const domHost = new MemoryVDOMHost(), domContainer = domHost.createContainer();
  dom = createNativeRoot(domHost, domContainer, { rootId: `held-dom-${randomUUID()}`,
    world, scheduleCommit });
  dom.mount(jsx(app.AppDom, {}));
  const forkHost = new MemoryVDOMHost(), forkContainer = forkHost.createContainer();
  const forkScheduled = [];
  fork = createNativeRoot(forkHost, forkContainer, { rootId: `held-fork-${randomUUID()}`,
    world: new OwnerStateWorld(), scheduleCommit(commit) { forkScheduled.push(commit); } });
  fork.mount(jsx(app.AppDom, {}));
  const scene = new THREE.Scene();
  three = createThreeNativeRoot(scene, { namespace: THREE,
    rootOptions: { rootId: `held-three-${randomUUID()}`, world, scheduleCommit } });
  three.root.mount(jsx(app.AppThree, {}));
  const domFallback = find(domContainer, (node) => node.props?.["data-joint"] === "waiting");
  const forkFallback = find(forkContainer, (node) => node.props?.["data-joint"] === "waiting");
  const sceneParent = scene.children[0], threeFallback = sceneParent?.children[0];
  assert.ok(domFallback && forkFallback && sceneParent instanceof THREE.Group &&
    threeFallback instanceof THREE.Group && threeFallback.name === "waiting");
  const dialog = () => find(domContainer, (node) => node.props?.["data-dialog-slot"] === "true");
  const forkDialog = () => find(forkContainer, (node) => node.props?.["data-dialog-slot"] === "true");
  assert.equal(dialog()?.props["data-open"], undefined);
  queue = new NativeRootWorkQueue();
  const observations = [];
  const work = queue.enqueueResources({ id: "held-a-dom-three", roots: [
    { root: dom, resources: [app.detail] }, { root: three.root, resources: [app.signal] },
  ], onSettled(outcome) {
    if (outcome.status !== "committed") throw outcome.error ??
      new Error(`held group ${outcome.status}`);
    observations.push({ dom: find(domContainer, (node) => node.props?.["data-joint"] === 11)?.props,
      three: sceneParent.children[0]?.children[0]?.position.toArray() });
  } });
  assert.equal(work.status, "pending", "compiler-proven resource group was not admitted");
  const domVersion = dom.publicationVersion, threeVersion = three.root.publicationVersion;
  app.independentB.dispatch(true);
  drain();
  assert.equal(work.status, "pending");
  assert.ok(dom.publicationVersion > domVersion, "independent B did not publish");
  assert.equal(three.root.publicationVersion, threeVersion);
  assert.equal(dialog()?.props["data-open"], true);
  assert.equal(forkDialog()?.props["data-open"], undefined,
    "fork published without its scheduled commit");
  assert.ok(forkScheduled.length > 0, "fork had no independent pending work");
  assert.strictEqual(find(domContainer, (node) => node.props?.["data-joint"] === "waiting"), domFallback);
  assert.strictEqual(sceneParent.children[0], threeFallback);
  app.heldA.dispatch(heldState(7, 8));
  app.independentB.dispatch(false);
  drain();
  assert.equal(work.status, "pending");
  assert.equal(dialog()?.props["data-open"], undefined);
  assert.strictEqual(find(domContainer, (node) => node.props?.["data-joint"] === "waiting"), domFallback);
  assert.strictEqual(sceneParent.children[0], threeFallback);
  app.detailWait.resolve(sample(4, 5));
  await Promise.resolve();
  drain();
  assert.equal(work.status, "pending");
  assert.strictEqual(find(domContainer, (node) => node.props?.["data-joint"] === "waiting"), domFallback);
  assert.strictEqual(sceneParent.children[0], threeFallback);
  app.signalWait.resolve(sample(2, 3));
  for (let turn = 0; turn < 24 && work.status === "pending"; turn++) {
    await Promise.resolve();
    drain();
  }
  assert.equal(work.status, "committed", "joint Store/resource reveal did not finish");
  assert.equal(observations.length, 1);
  assert.equal(observations[0].dom["data-joint"], 11);
  assert.deepEqual(observations[0].three, [7, 2, 11]);
  assert.equal(app.heldA.getStateForRoot(dom.rootId).vector.x, 7);
  assert.equal(app.heldA.getStateForRoot(three.root.rootId).vector.x, 7);
  assert.strictEqual(find(forkContainer, (node) => node.props?.["data-joint"] === "waiting"), forkFallback);
  assert.equal(app.heldA.getStateForRoot(fork.rootId).vector.x, 7,
    "fork Store projection did not receive the domain action");
  assert.equal(app.trace.mounts - app.trace.cleanups, 2);
  assert.ok(app.trace.setters.length >= 2);
  const choiceDetailWait = deferred(), choiceSignalWait = deferred();
  choiceA = createStore(heldState(1, 2), (_old, next) => next);
  choiceB = createStore(false, (_old, next) => next);
  const choiceDetail = new AsyncResource(choiceDetailWait.promise);
  const choiceSignal = new AsyncResource(choiceSignalWait.promise);
  const choiceHost = new MemoryVDOMHost();
  const choiceContainer = choiceHost.createContainer();
  choiceRoot = createNativeRoot(choiceHost, choiceContainer, {
    rootId: `held-choice-${randomUUID()}`, scheduleCommit,
  });
  choiceRoot.mount(jsx("main", {}, [
    jsx(app.ControlledChoice, { key: "choice-owner", heldA: choiceA,
      detail: choiceDetail, signal: choiceSignal }),
    jsx(app.DialogSlot, { key: "choice-dialog", independentB: choiceB }),
  ]));
  const choiceFallback = find(choiceContainer, (node) => node.props?.["data-choice"] === "waiting");
  assert.ok(choiceFallback, "A-controlled choice did not suspend");
  choiceQueue = new NativeRootWorkQueue();
  const choiceSettled = [];
  const choiceWork = choiceQueue.enqueueResources({ id: "selected-detail", roots: [
    { root: choiceRoot, resources: [choiceDetail] },
  ], onSettled(outcome) { choiceSettled.push(outcome); } });
  assert.equal(choiceWork.status, "pending", "old selected resource group was not admitted");
  choiceA.dispatch(heldState(-1, 9));
  choiceB.dispatch(true);
  drain();
  assert.strictEqual(find(choiceContainer, (node) => node.props?.["data-choice"] === "waiting"),
    choiceFallback);
  choiceDetailWait.resolve(sample(30, 40));
  for (let turn = 0; turn < 24 && choiceWork.status === "pending"; turn++) {
    await Promise.resolve();
    drain();
  }
  assert.equal(choiceWork.status, "failed", "obsolete selected resource was not declined");
  assert.equal(choiceSettled.length, 1);
  assert.match(String(choiceSettled[0].error ?? choiceSettled[0].reason),
    /Scoped root delta is unavailable/);
  assert.strictEqual(find(choiceContainer, (node) => node.props?.["data-choice"] === "waiting"),
    choiceFallback, "obsolete positive-branch resource revealed");
  assert.equal(find(choiceContainer, (node) => node.props?.["data-joint"] === 31), undefined,
    "obsolete positive-branch output published");
  assert.equal(find(choiceContainer, (node) => node.props?.["data-dialog-slot"] === "true")?.props["data-open"],
    true, "independent B did not publish after the unsafe hold retired");
  choiceSignalWait.resolve(sample(6, 7));
  for (let turn = 0; turn < 24 && !find(choiceContainer,
    (node) => node.props?.["data-joint"] === 5); turn++) {
    await Promise.resolve();
    drain();
  }
  const choiceResult = find(choiceContainer, (node) => node.props?.["data-joint"] === 5);
  assert.ok(choiceResult, "latest A-controlled resource did not reveal");
  assert.equal(choiceResult.props["data-joint"], 5);
  assert.equal(choiceResult.children[0].props["data-value"], 16);
  const localDetailWait = deferred(), localSignalWait = deferred();
  localA = createStore(heldState(1, 2), (_old, next) => next);
  const localDetail = new AsyncResource(localDetailWait.promise);
  const localSignal = new AsyncResource(localSignalWait.promise);
  const localHost = new MemoryVDOMHost(), localContainer = localHost.createContainer();
  localRoot = createNativeRoot(localHost, localContainer, {
    rootId: `held-local-choice-${randomUUID()}`, scheduleCommit,
  });
  localRoot.mount(jsx(app.LocalChoice, { heldA: localA,
    detail: localDetail, signal: localSignal }));
  const localFallback = find(localContainer, (node) => node.props?.["data-choice"] === "waiting");
  assert.ok(localFallback, "local choice did not suspend");
  const localSetter = app.trace.localChoiceSetters.at(-1);
  assert.equal(typeof localSetter, "function", "compiled local setter missing");
  localQueue = new NativeRootWorkQueue();
  const localSettled = [];
  const localWork = localQueue.enqueueResources({ id: "selected-local-detail", roots: [
    { root: localRoot, resources: [localDetail] },
  ], onSettled(outcome) { localSettled.push(outcome); } });
  assert.equal(localWork.status, "pending", "old local resource group was not admitted");
  localSetter(-1);
  drain();
  assert.strictEqual(find(localContainer, (node) => node.props?.["data-choice"] === "waiting"),
    localFallback);
  localDetailWait.resolve(sample(30, 40));
  for (let turn = 0; turn < 24 && localWork.status === "pending"; turn++) {
    await Promise.resolve();
    drain();
  }
  assert.equal(localWork.status, "failed", "obsolete local resource was not declined");
  assert.equal(localSettled.length, 1);
  assert.match(String(localSettled[0].error ?? localSettled[0].reason),
    /Scoped root delta is unavailable/);
  assert.strictEqual(find(localContainer, (node) => node.props?.["data-choice"] === "waiting"),
    localFallback, "obsolete local resource revealed");
  assert.equal(find(localContainer, (node) => node.props?.["data-joint"] === 31), undefined);
  localSignalWait.resolve(sample(6, 7));
  for (let turn = 0; turn < 24 && !find(localContainer,
    (node) => node.props?.["data-joint"] === 7); turn++) {
    await Promise.resolve();
    drain();
  }
  const localResult = find(localContainer, (node) => node.props?.["data-joint"] === 7);
  assert.ok(localResult, "latest local-controlled resource did not reveal");
  assert.equal(localResult.children[0].props["data-value"], 9);
  const positiveDetailWait = deferred(), positiveSignalWait = deferred();
  positiveA = createStore(heldState(1, 2), (_old, next) => next);
  const positiveDetail = new AsyncResource(positiveDetailWait.promise);
  const positiveSignal = new AsyncResource(positiveSignalWait.promise);
  const positiveHost = new MemoryVDOMHost(), positiveContainer = positiveHost.createContainer();
  positiveRoot = createNativeRoot(positiveHost, positiveContainer, {
    rootId: `held-unchanged-choice-${randomUUID()}`, scheduleCommit,
  });
  positiveRoot.mount(jsx(app.ControlledChoice, { heldA: positiveA,
    detail: positiveDetail, signal: positiveSignal }));
  const positiveFallback = find(positiveContainer, (node) => node.props?.["data-choice"] === "waiting");
  assert.ok(positiveFallback, "unchanged choice did not suspend");
  positiveQueue = new NativeRootWorkQueue();
  const positiveSettled = [];
  const positiveWork = positiveQueue.enqueueResources({ id: "unchanged-selected-detail", roots: [
    { root: positiveRoot, resources: [positiveDetail] },
  ], onSettled(outcome) { positiveSettled.push(outcome); } });
  assert.equal(positiveWork.status, "pending", "unchanged choice group was not admitted");
  positiveDetailWait.resolve(sample(4, 5));
  for (let turn = 0; turn < 24 && positiveWork.status === "pending"; turn++) {
    await Promise.resolve();
    drain();
  }
  assert.equal(positiveWork.status, "committed", "unchanged ancestor was incorrectly declined");
  assert.equal(positiveSettled.length, 1);
  assert.equal(positiveSettled[0].status, "committed");
  const positiveResult = find(positiveContainer, (node) => node.props?.["data-joint"] === 5);
  assert.ok(positiveResult, "unchanged selected detail did not reveal");
  assert.equal(positiveResult.children[0].props["data-value"], 7);
  executionProof = {
    status: "PASS", groupStatus: work.status, observations,
    domProjectedA: app.heldA.getStateForRoot(dom.rootId).vector.x,
    threeProjectedA: app.heldA.getStateForRoot(three.root.rootId).vector.x,
    forkProjectedA: app.heldA.getStateForRoot(fork.rootId).vector.x,
    controlledChoice: { obsoleteResourcePublished: false,
      latestA: choiceA.getStateForRoot(choiceRoot.rootId).vector.x,
      jointValue: choiceResult.props["data-joint"] },
    localChoice: { obsoleteResourcePublished: false, jointValue: localResult.props["data-joint"] },
    unchangedChoice: { groupStatus: positiveWork.status,
      jointValue: positiveResult.props["data-joint"] },
  };
} catch (error) {
  primaryError = error;
} finally {
  const cleanupErrors = [];
  for (const target of [queue, choiceQueue, localQueue, positiveQueue,
    dom, fork, choiceRoot, localRoot, positiveRoot, three]) {
    try { target?.dispose(); } catch (error) { cleanupErrors.push(error); }
  }
  try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
  if (sourcePath) {
    try { invalidateCompiledSemanticPlan(sourcePath); } catch (error) { cleanupErrors.push(error); }
  }
  if (app && dom && fork && three && choiceRoot && choiceA && choiceB && localRoot && localA &&
    positiveRoot && positiveA) {
    try {
      assert.equal(app.trace.mounts, app.trace.cleanups, "dialog effects leaked");
      assert.equal(app.heldA.diagnostics().readers, 0, "shared held A readers leaked");
      assert.equal(app.independentB.diagnostics().readers, 0, "shared B readers leaked");
      assert.equal(choiceA.diagnostics().readers, 0, "choice A readers leaked");
      assert.equal(choiceB.diagnostics().readers, 0, "choice B readers leaked");
      assert.equal(localA.diagnostics().readers, 0, "local A readers leaked");
      assert.equal(positiveA.diagnostics().readers, 0, "positive A readers leaked");
      for (const store of [app.heldA, app.independentB, choiceA, choiceB, localA, positiveA])
        assert.equal(store.diagnostics().roots, 0, "Store root projection leaked");
      for (const root of [dom, fork, three.root, choiceRoot, localRoot, positiveRoot])
        assert.equal(root.diagnostics().ownerCount, 0, `${root.rootId} owner leaked`);
      assert.equal(three.host.diagnostics.liveHandles, 0, "Three host handles leaked");
      assert.equal(three.host.diagnostics.liveResources, 0, "Three host resources leaked");
    } catch (error) { cleanupErrors.push(error); }
  }
  if (cleanupErrors.length) primaryError = new AggregateError(
    primaryError ? [primaryError, ...cleanupErrors] : cleanupErrors, "held reader cleanup failed");
}
if (primaryError) throw primaryError;
await writeFile(path.join(directory, "execution-proof.json"), JSON.stringify(executionProof,
  null, 2) + "\n", { flag: "wx" });
console.log(`PASS compiled held reader progress; provenance: ${directory}`);
