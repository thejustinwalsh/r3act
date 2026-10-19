import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { transformWithOxc } from "vite";
import * as THREE from "three";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { AsyncResource, createNativeRoot, jsx, OwnerStateWorld } from "../src/native_runtime_api.ts";
import { invalidateCompiledSemanticPlan } from "../src/compiled_semantic_plan.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const unit = path.join(root, "implementation/2026-10-19-numeric-owner-effects");
const mode = process.argv.includes("--baseline") ? "baseline" : "fixed";
const baselineRecord = JSON.parse(await readFile(path.join(unit, "baseline/provenance.json")));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const baselineReportBytes = await readFile(path.join(unit, baselineRecord.copiedReport));
assert.equal(sha(baselineReportBytes), baselineRecord.reportSha256);
const baselineReport = JSON.parse(baselineReportBytes);
assert.equal(baselineReport.compilerBinary.sha256, baselineRecord.sha256);
const baselineBinary = path.join(unit, baselineRecord.copiedPath);
assert.equal(sha(await readFile(baselineBinary)), baselineRecord.sha256);
assert.equal(baselineRecord.sha256, "ddeb55aabade62c3258358928c658886049329713ac0fcb1518fcc8bcf610510");
const compilerBinary = mode === "baseline" ? baselineBinary :
  path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const fixture = path.join(root, "compiler/fixtures/native-numeric-owner-effects.tsx");
const artifact = path.join(root, ".cache", `compiled-numeric-owner-${mode}-${randomUUID()}`);
const source = (await readFile(fixture, "utf8")).replace('"native_runtime_api.ts"',
  JSON.stringify(pathToFileURL(path.join(root, "src/native_runtime_api.ts")).href));
const property = (node, name) => node?.type === "ObjectExpression" ?
  (node.properties.find(entry => entry.type === "ObjectProperty" && !entry.computed &&
    (entry.key.name ?? entry.key.value) === name)?.value ?? null) : null;
const literal = node => ["StringLiteral", "NumericLiteral"].includes(node?.type) ? node.value : null;
const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [key, child] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
    if (Array.isArray(child)) child.forEach(item => visit(item, callback));
    else if (child && typeof child === "object") visit(child, callback);
  }
};
const find = (node, predicate) => !node ? null : predicate(node) ? node :
  (node.children ?? []).map(child => find(child, predicate)).find(Boolean) ?? null;
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const sample = x => ({ sample: { x } });
const plugin = nativeModuleCompilerPlugin({ root, compilerBinary });
const context = { addWatchFile() {}, error(message) { throw new Error(String(message)); } };
const receipt = { mode, status: "STARTED", artifact, compilerSha256: sha(await readFile(compilerBinary)),
  baselineSha256: baselineRecord.sha256, baselineReportSha256: baselineRecord.reportSha256,
  runtimeSourceSha256: Object.fromEntries(await Promise.all([
    "src/component_state_runtime.ts", "src/jsx_binding_runtime.ts",
    "src/vdom_snapshot_runtime.ts", "src/compiled_semantic_plan.ts",
  ].map(async relative => [relative, sha(await readFile(path.join(root, relative)))]))),
  sourceSha256: sha(source), metadata: {}, observations: {}, errors: [] };
let dom, fork, initializerRoot, negativeRoot, throwRoot, three, app, sourcePath, sourceFile, primaryError;
const propRoots = [];
try {
  await mkdir(artifact, { recursive: true });
  sourcePath = path.join(artifact, "numeric-owner-effects.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  const transformed = await plugin.transform.call(context, source, sourcePath);
  assert.ok(transformed?.code, "Rust/OXC did not compile numeric owner fixture");
  await writeFile(path.join(artifact, "transformed.tsx"), transformed.code, { flag: "wx" });
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  const registrations = new Map();
  let plan;
  visit(ast, node => {
    if (node.type === "CallExpression" && node.callee?.name === "__registerNativeSemanticPlan")
      plan = node.arguments[0];
    if (node.type !== "CallExpression" || !/^(?:__nativeDefineComponent_*)$/.test(node.callee?.name ?? "")) return;
    const id = literal(node.arguments[0]);
    if (id?.includes("#component:")) registrations.set(id.split("#component:")[1], node);
  });
  assert.ok(plan, "compiled semantic plan registration missing");
  sourceFile = literal(property(plan, "source_file"));
  assert.equal(typeof sourceFile, "string");
  assert.equal(path.isAbsolute(sourceFile), false, "compiled source key must be root-relative");
  receipt.sourceFile = sourceFile;
  for (const name of ["OpaqueSibling", "HotCounter", "PureNamed", "PureArrow",
    "DerivedPure", "InitializerOwner", "CapturedCallback", "HiddenCapture",
    "PrimitiveProp", "PrimitiveMutation"])
    assert.ok(registrations.has(name), `${name} missing actual compiled owner`);
  const metadata = name => registrations.get(name).arguments[2];
  for (const name of ["OpaqueSibling", "InitializerOwner", "CapturedCallback", "HiddenCapture"]) {
    const sites = property(metadata(name), "propOnlySites");
    receipt.metadata[name] = { propOnlySites: sites?.elements.map(literal) ?? null,
      ownerUpdateProgram: property(metadata(name), "ownerUpdateProgram")?.type ?? null };
    if (mode === "fixed") {
      assert.deepEqual(receipt.metadata[name].propOnlySites, [], `${name} wrongly skips owner`);
      assert.equal(receipt.metadata[name].ownerUpdateProgram, null);
    }
  }
  for (const name of ["HotCounter", "PureNamed", "PureArrow", "DerivedPure"]) {
    const sites = property(metadata(name), "propOnlySites");
    receipt.metadata[name] = { propOnlySites: sites?.elements.map(literal) ?? null,
      ownerUpdateProgram: property(metadata(name), "ownerUpdateProgram")?.type ?? null };
    if (mode === "fixed") {
      assert.ok(receipt.metadata[name].propOnlySites?.length > 0, `${name} lost safe numeric site`);
      assert.ok(receipt.metadata[name].ownerUpdateProgram, `${name} lost numeric owner program`);
    }
  }
  const primitiveMeta = metadata("PrimitiveProp");
  receipt.metadata.PrimitiveProp = {
    propOnlySites: property(primitiveMeta, "propOnlySites")?.elements.map(literal) ?? null,
    numericPrimitiveProps: property(primitiveMeta, "numericPrimitiveProps")?.elements.map(literal) ?? null,
    ownerUpdateProgram: property(primitiveMeta, "ownerUpdateProgram")?.type ?? null,
  };
  if (mode === "fixed") {
    assert.ok(receipt.metadata.PrimitiveProp.propOnlySites?.length > 0);
    assert.deepEqual(receipt.metadata.PrimitiveProp.numericPrimitiveProps, ["id"]);
    assert.ok(receipt.metadata.PrimitiveProp.ownerUpdateProgram);
  }
  assert.match(transformed.code, /__nativeNumericPrograms/);
  const emitted = await transformWithOxc(transformed.code, sourcePath,
    { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
  const modulePath = path.join(artifact, "executable.mjs");
  await writeFile(modulePath, emitted.code, { flag: "wx" });
  app = await import(pathToFileURL(modulePath).href);
  const world = new OwnerStateWorld();
  const pending = [];
  const scheduleCommit = commit => pending.push(commit);
  const drain = () => {
    for (let turn = 0; turn < 24 && pending.length; turn++) pending.shift()();
    assert.equal(pending.length, 0, "owner work did not quiesce");
  };
  const domHost = new MemoryVDOMHost(), container = domHost.createContainer();
  dom = createNativeRoot(domHost, container, { rootId: `numeric-dom-${randomUUID()}`,
    world, scheduleCommit });
  dom.mount(jsx(app.App, {}));
  const opaque = () => find(container, node => node.props?.["data-opaque"] !== undefined);
  const firstOpaque = opaque();
  assert.equal(firstOpaque?.props["data-n"], 1);
  assert.equal(firstOpaque?.props["data-opaque"], "A");
  assert.equal(app.trace.opaqueMounts, 1);
  const hot = () => find(container, node => node.props?.["data-hot"] !== undefined);
  const firstHot = hot();
  const hotSetter = app.trace.setHot;
  assert.equal(typeof hotSetter, "function");
  const opaqueBeforeHot = app.trace.opaqueCalls;
  hotSetter(1);
  drain();
  receipt.observations.hot = { value: hot()?.props["data-hot"] ?? null,
    sameHost: hot() === firstHot, mounts: app.trace.hotMounts,
    cleanups: app.trace.hotCleanups, opaqueCallsDelta: app.trace.opaqueCalls - opaqueBeforeHot };
  if (mode === "fixed") assert.deepEqual(receipt.observations.hot,
    { value: 2, sameHost: true, mounts: 1, cleanups: 0, opaqueCallsDelta: 0 });
  const mainSetter = app.trace.setOpaque;
  assert.equal(typeof mainSetter, "function");
  const readsBefore = app.trace.opaqueCalls, gettersBefore = app.trace.getterCalls;
  app.trace.opaqueValue = "B";
  mainSetter(1);
  let updateError = null;
  try { drain(); dom.flush(); } catch (error) { updateError = String(error); }
  receipt.observations.firstUpdate = { updateError,
    dataN: opaque()?.props["data-n"] ?? null, dataOpaque: opaque()?.props["data-opaque"] ?? null,
    sameHost: opaque() === firstOpaque, opaqueCallsDelta: app.trace.opaqueCalls - readsBefore,
    getterCallsDelta: app.trace.getterCalls - gettersBefore,
    mounts: app.trace.opaqueMounts, cleanups: app.trace.opaqueCleanups };
  if (mode === "fixed") {
    assert.equal(updateError, null);
    assert.deepEqual(receipt.observations.firstUpdate, { updateError: null,
      dataN: 2, dataOpaque: "B", sameHost: true, opaqueCallsDelta: 1,
      getterCallsDelta: 1, mounts: 1, cleanups: 0 });
  }
  const forkHost = new MemoryVDOMHost(), forkContainer = forkHost.createContainer();
  const forkPending = [];
  fork = createNativeRoot(forkHost, forkContainer, { rootId: `numeric-fork-${randomUUID()}`,
    world: new OwnerStateWorld(), scheduleCommit(commit) { forkPending.push(commit); } });
  fork.mount(jsx(app.App, {}));
  const forkOpaque = () => find(forkContainer, node => node.props?.["data-opaque"] !== undefined);
  assert.equal(forkOpaque()?.props["data-n"], 1);
  const forkSetter = app.trace.setOpaque;
  assert.notStrictEqual(forkSetter, mainSetter);
  app.trace.opaqueValue = "C";
  mainSetter(2);
  try { drain(); dom.flush(); } catch (error) { receipt.observations.secondUpdateError = String(error); }
  receipt.observations.fork = { mainN: opaque()?.props["data-n"],
    mainOpaque: opaque()?.props["data-opaque"], forkN: forkOpaque()?.props["data-n"],
    forkOpaque: forkOpaque()?.props["data-opaque"], pending: forkPending.length };
  if (mode === "fixed") {
    assert.equal(receipt.observations.secondUpdateError, undefined);
    assert.deepEqual(receipt.observations.fork, { mainN: 3, mainOpaque: "C",
      forkN: 1, forkOpaque: "B", pending: 0 });
    assert.equal(app.trace.opaqueMounts, 2);
    assert.equal(app.trace.opaqueCleanups, 0);
  }
  const initHost = new MemoryVDOMHost(), initContainer = initHost.createContainer();
  initializerRoot = createNativeRoot(initHost, initContainer,
    { rootId: `numeric-initializer-${randomUUID()}`, scheduleCommit });
  initializerRoot.mount(jsx(app.InitializerOwner, {}));
  const initSetter = app.trace.setInitializer;
  const initialCalls = app.trace.initializerCalls;
  assert.equal(typeof initSetter, "function");
  initSetter(1);
  try { drain(); initializerRoot.flush(); } catch (error) { receipt.observations.initializerError = String(error); }
  receipt.observations.initializer = { callsDelta: app.trace.initializerCalls - initialCalls,
    value: find(initContainer, node => node.props?.["data-initializer"] !== undefined)
      ?.props["data-initializer"] ?? null };
  if (mode === "fixed") {
    assert.equal(receipt.observations.initializerError, undefined);
    assert.deepEqual(receipt.observations.initializer, { callsDelta: 1, value: 2 });
    assert.equal(app.trace.initializerMounts, 1);
    assert.equal(app.trace.initializerCleanups, 0);
  }
  const negativeHost = new MemoryVDOMHost(), negativeContainer = negativeHost.createContainer();
  negativeRoot = createNativeRoot(negativeHost, negativeContainer,
    { rootId: `numeric-negative-${randomUUID()}` });
  let callbacks = 0;
  negativeRoot.mount(jsx("main", {}, [jsx(app.CapturedCallback, {
    onAction() { callbacks++; } }), jsx(app.HiddenCapture, {})]));
  find(negativeContainer, node => node.tag === "button")?.props.onClick();
  assert.equal(callbacks, 1);
  assert.equal(find(negativeContainer, node => node.props?.["data-capture"] !== undefined)
    ?.props["data-capture"], 1);
  if (mode === "fixed") {
    const exerciseProps = (label, element, expectedRenders) => {
      const host = new MemoryVDOMHost(), container = host.createContainer();
      const pendingProps = [], frames = [];
      const rootForProps = createNativeRoot(host, container, {
        rootId: `numeric-props-${label}-${randomUUID()}`,
        scheduleCommit(commit) { pendingProps.push(commit); },
        profileCounter(frame) { frames.push(frame); },
      });
      propRoots.push(rootForProps);
      rootForProps.mount(element);
      const output = () => find(container, node => node.props?.["data-primitive"] !== undefined);
      const accepted = output();
      assert.equal(accepted?.props["data-primitive"], 1);
      const setter = app.trace.setPrimitive;
      assert.equal(typeof setter, "function");
      const renderCount = () => frames.reduce((sum, frame) =>
        sum + (frame["owner.component-renders"] ?? 0), 0);
      const before = renderCount();
      setter(1);
      for (let turn = 0; turn < 12 && pendingProps.length; turn++) pendingProps.shift()();
      assert.equal(pendingProps.length, 0);
      rootForProps.flush();
      const observation = { value: output()?.props["data-primitive"] ?? null,
        sameHost: output() === accepted, ownerRenders: renderCount() - before };
      assert.equal(observation.value, 2, `${label} must publish latest local state`);
      assert.equal(observation.sameHost, true, `${label} must retain keyed host`);
      if (expectedRenders === "none") assert.equal(observation.ownerRenders, 0,
        `${label} must admit the owned primitive numeric cut`);
      else assert.ok(observation.ownerRenders >= 1,
        `${label} must reexecute the generic owner`);
      return observation;
    };
    const mutableId = { value: "object" };
    const unownedProps = { id: "unowned" };
    const proxyTarget = { id: "proxy" };
    let proxyReads = 0;
    const proxyProps = new Proxy(proxyTarget, {
      get(target, name, receiver) {
        if (name === "id") proxyReads++;
        return Reflect.get(target, name, receiver);
      },
    });
    receipt.observations.primitiveProps = {
      owned: exerciseProps("owned", jsx(app.PrimitiveProp, { id: "owned" }), "none"),
      object: exerciseProps("object", jsx(app.PrimitiveProp, { id: mutableId }), "generic"),
      unowned: exerciseProps("unowned", { type: app.PrimitiveProp, props: unownedProps }, "generic"),
      proxy: exerciseProps("proxy", { type: app.PrimitiveProp, props: proxyProps }, "generic"),
    };
    assert.equal(Object.isFrozen(unownedProps), false);
    assert.equal(Object.isFrozen(proxyTarget), false);
    assert.ok(proxyReads >= 2, "generic Proxy props retain observable reads");
    const transitionHost = new MemoryVDOMHost(), transitionContainer = transitionHost.createContainer();
    const transitionPending = [], transitionFrames = [];
    const transitionRoot = createNativeRoot(transitionHost, transitionContainer, {
      rootId: `numeric-props-transition-${randomUUID()}`,
      scheduleCommit(commit) { transitionPending.push(commit); },
      profileCounter(frame) { transitionFrames.push(frame); },
    });
    propRoots.push(transitionRoot);
    const transitionOutput = () => find(transitionContainer,
      node => node.props?.["data-primitive"] !== undefined);
    const transitionRenders = () => transitionFrames.reduce((sum, frame) =>
      sum + (frame["owner.component-renders"] ?? 0), 0);
    transitionRoot.mount(jsx(app.PrimitiveProp, { key: "same-owner", id: "A" }));
    const transitionHostNode = transitionOutput();
    const firstTransitionSetter = app.trace.setPrimitive;
    const initialTransitionRenders = transitionRenders();
    firstTransitionSetter(1);
    for (let turn = 0; turn < 12 && transitionPending.length; turn++) transitionPending.shift()();
    transitionRoot.flush();
    assert.equal(transitionRenders() - initialTransitionRenders, 0,
      "owned primitive starts on the numeric path");
    assert.equal(transitionOutput()?.props["data-primitive"], 2);
    const transitionTarget = { key: "same-owner", id: "A" };
    let transitionReads = 0;
    const transitionProxy = new Proxy(transitionTarget, {
      get(target, name, receiver) {
        if (name === "id") transitionReads++;
        return Reflect.get(target, name, receiver);
      },
    });
    transitionRoot.update({ type: app.PrimitiveProp, props: transitionProxy });
    transitionRoot.flush();
    const transitionSetter = app.trace.setPrimitive;
    const beforeUnownedState = transitionRenders();
    transitionSetter(2);
    for (let turn = 0; turn < 12 && transitionPending.length; turn++) transitionPending.shift()();
    transitionRoot.flush();
    receipt.observations.primitiveTransition = {
      value: transitionOutput()?.props["data-primitive"] ?? null,
      id: transitionOutput()?.props["data-id"] ?? null,
      sameHost: transitionOutput() === transitionHostNode,
      ownerRenders: transitionRenders() - beforeUnownedState,
      proxyReads: transitionReads,
    };
    assert.equal(receipt.observations.primitiveTransition.value, 3);
    assert.equal(receipt.observations.primitiveTransition.id, "A");
    assert.equal(receipt.observations.primitiveTransition.sameHost, true);
    assert.ok(receipt.observations.primitiveTransition.ownerRenders >= 1,
      "same-valued unowned replacement must invalidate numeric admission");
    assert.ok(receipt.observations.primitiveTransition.proxyReads >= 2);
    assert.equal(Object.isFrozen(transitionTarget), false);
    const lateHost = new MemoryVDOMHost(), lateContainer = lateHost.createContainer();
    const latePending = [], lateFrames = [];
    const lateRoot = createNativeRoot(lateHost, lateContainer, {
      rootId: `numeric-props-late-freeze-${randomUUID()}`,
      scheduleCommit(commit) { latePending.push(commit); },
      profileCounter(frame) { lateFrames.push(frame); },
    });
    propRoots.push(lateRoot);
    const lateTarget = { key: "late", id: "A" };
    const lateProxy = new Proxy(lateTarget, {});
    lateRoot.mount({ type: app.PrimitiveProp, props: lateProxy });
    const latePrivateProps = app.trace.primitiveProps;
    assert.ok(latePrivateProps && latePrivateProps !== lateProxy,
      "activation effect must hold a private rendered props copy");
    assert.equal(Object.isFrozen(latePrivateProps), false);
    latePrivateProps.id = "B";
    Object.freeze(latePrivateProps);
    lateTarget.id = "B";
    const lateSetter = app.trace.setPrimitive;
    const lateBefore = lateFrames.reduce((sum, frame) =>
      sum + (frame["owner.component-renders"] ?? 0), 0);
    lateSetter(1);
    for (let turn = 0; turn < 12 && latePending.length; turn++) latePending.shift()();
    lateRoot.flush();
    const lateRenders = lateFrames.reduce((sum, frame) =>
      sum + (frame["owner.component-renders"] ?? 0), 0) - lateBefore;
    receipt.observations.primitiveLateFreeze = {
      value: find(lateContainer, node => node.props?.["data-primitive"] !== undefined)
        ?.props["data-primitive"] ?? null,
      id: find(lateContainer, node => node.props?.["data-primitive"] !== undefined)
        ?.props["data-id"] ?? null,
      ownerRenders: lateRenders,
      sourceFrozen: Object.isFrozen(lateTarget),
      privateFrozen: Object.isFrozen(latePrivateProps),
    };
    assert.deepEqual({ value: receipt.observations.primitiveLateFreeze.value,
      id: receipt.observations.primitiveLateFreeze.id,
      sourceFrozen: receipt.observations.primitiveLateFreeze.sourceFrozen,
      privateFrozen: receipt.observations.primitiveLateFreeze.privateFrozen },
    { value: 2, id: "B", sourceFrozen: false, privateFrozen: true });
    assert.ok(lateRenders >= 1, "late private freeze cannot upgrade unowned admission");
    const mutationHost = new MemoryVDOMHost(), mutationContainer = mutationHost.createContainer();
    const mutationRoot = createNativeRoot(mutationHost, mutationContainer,
      { rootId: `numeric-mutation-${randomUUID()}` });
    propRoots.push(mutationRoot);
    const sourceElement = jsx(app.PrimitiveMutation, { id: "stable" });
    mutationRoot.mount(sourceElement);
    receipt.observations.primitiveMutation = {
      error: app.trace.mutationError,
      sourceId: sourceElement.props.id,
      acceptedId: find(mutationContainer, node => node.props?.["data-mutation"] !== undefined)
        ?.props["data-id"] ?? null,
    };
    assert.match(receipt.observations.primitiveMutation.error ?? "", /read only|Cannot assign|readonly/i);
    assert.equal(receipt.observations.primitiveMutation.sourceId, "stable");
    assert.equal(receipt.observations.primitiveMutation.acceptedId, "stable");
  }
  const wait = deferred();
  const resource = new AsyncResource(wait.promise);
  const scene = new THREE.Scene();
  three = createThreeNativeRoot(scene, { namespace: THREE,
    rootOptions: { rootId: `numeric-three-${randomUUID()}`, world, scheduleCommit } });
  three.root.mount(jsx(app.SceneApp, { resource }));
  assert.equal(scene.children[0]?.children[0]?.name, "waiting");
  const throwHost = new MemoryVDOMHost(), throwContainer = throwHost.createContainer();
  const throwPending = [];
  throwRoot = createNativeRoot(throwHost, throwContainer,
    { rootId: `numeric-throw-${randomUUID()}`,
      scheduleCommit(commit) { throwPending.push(commit); } });
  throwRoot.mount(jsx(app.OpaqueSibling, {}));
  const throwSetter = app.trace.setOpaque;
  const throwAccepted = find(throwContainer, node => node.props?.["data-opaque"] !== undefined);
  assert.ok(throwAccepted);
  app.trace.throwOpaque = true;
  throwSetter(1);
  let thrown = null;
  try {
    for (let turn = 0; turn < 12 && throwPending.length; turn++) throwPending.shift()();
    throwRoot.flush();
  } catch (error) { thrown = String(error); }
  receipt.observations.throw = { error: thrown,
    acceptedRetained: find(throwContainer, node => node.props?.["data-opaque"] !== undefined) === throwAccepted,
    sceneWaiting: scene.children[0]?.children[0]?.name === "waiting" };
  if (mode === "fixed") {
    assert.match(thrown ?? "", /opaque getter failed/);
    assert.equal(receipt.observations.throw.acceptedRetained, true);
    assert.equal(receipt.observations.throw.sceneWaiting, true);
  }
  throwRoot.dispose();
  app.trace.throwOpaque = false;
  wait.resolve(sample(4));
  for (let turn = 0; turn < 16 && !scene.children[0]?.children[0]?.children[0]; turn++) {
    await Promise.resolve();
    drain();
  }
  receipt.observations.scenePosition = scene.children[0]?.children[0]?.children[0]
    ?.position.toArray() ?? null;
  if (mode === "fixed") assert.deepEqual(receipt.observations.scenePosition, [4, 0, 0]);
  const revision = transformed.code.match(/"module_revision"\s*:\s*"([^"]+)"/)?.[1];
  assert.ok(revision);
  assert.equal(invalidateCompiledSemanticPlan(sourceFile, revision), true);
  await Promise.resolve();
  if (mode === "fixed") {
    assert.equal(dom.retired, true);
    assert.equal(fork.retired, true);
    assert.equal(three.root.retired, true);
  }
  receipt.observations.retired = { dom: dom.retired, fork: fork.retired,
    three: three.root.retired };
  receipt.status = mode === "fixed" ? "PASS_COMPILED_NUMERIC_OWNER" : "BASELINE_OBSERVED";
} catch (error) {
  primaryError = error;
  receipt.status = "FAIL_OR_INCOMPLETE";
  receipt.errors.push(error instanceof Error ? error.stack ?? String(error) : String(error));
} finally {
  const cleanupErrors = [];
  for (const target of [dom, fork, initializerRoot, negativeRoot, throwRoot, three, ...propRoots]) {
    try { target?.dispose(); } catch (error) { cleanupErrors.push(error); }
  }
  try { await plugin.closeBundle(); } catch (error) { cleanupErrors.push(error); }
  for (const [relative, expected] of Object.entries(receipt.runtimeSourceSha256)) {
    try { assert.equal(sha(await readFile(path.join(root, relative))), expected,
      `runtime source changed during ${mode} execution: ${relative}`); }
    catch (error) { cleanupErrors.push(error); }
  }
  if (sourceFile) try { invalidateCompiledSemanticPlan(sourceFile); }
  catch (error) { cleanupErrors.push(error); }
  if (app && dom && fork && initializerRoot && negativeRoot && throwRoot && three) {
    try {
      assert.equal(app.trace.opaqueMounts, app.trace.opaqueCleanups);
      assert.equal(app.trace.hotMounts, app.trace.hotCleanups);
      assert.equal(app.trace.initializerMounts, app.trace.initializerCleanups);
      for (const target of [dom, fork, initializerRoot, negativeRoot, throwRoot, three.root])
        assert.equal(target.diagnostics().ownerCount, 0);
      for (const target of propRoots) assert.equal(target.diagnostics().ownerCount, 0);
      assert.equal(three.host.diagnostics.liveHandles, 0);
      assert.equal(three.host.diagnostics.liveResources, 0);
    } catch (error) { cleanupErrors.push(error); }
  }
  if (cleanupErrors.length) {
    const combined = new AggregateError(primaryError ? [primaryError, ...cleanupErrors] : cleanupErrors,
      "numeric owner cleanup failed", { cause: primaryError });
    primaryError = combined;
    receipt.status = "FAIL_OR_INCOMPLETE";
    receipt.errors.push(String(combined));
  }
  await mkdir(artifact, { recursive: true });
  await writeFile(path.join(artifact, "receipt.json"), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
}
if (primaryError) throw primaryError;
console.log(JSON.stringify({ status: receipt.status, artifact }));
