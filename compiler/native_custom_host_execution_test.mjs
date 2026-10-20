import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transformWithOxc } from "vite";
import * as THREE from "three";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { NativeRootWorkQueue, createNativeRoot, createStore, createWorld, jsx } from "../src/native_runtime_api.ts";
import { MemoryVDOMHost } from "../src/vdom_snapshot_runtime.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";
import { Brush, RetainedCanvasHost } from "../examples/custom-host/retained_host.ts";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const compilerBinary = path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const authoredDirectory = path.join(root, "examples/custom-host");
const artifact = path.join(root, ".cache", `compiled-custom-host-${randomUUID()}`);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const withDeadline = async (promise, label) => {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out`)), 2000);
    })]);
  } finally { clearTimeout(timer); }
};
const find = (node, predicate) => !node ? null : predicate(node) ? node :
  (node.children ?? []).map((child) => find(child, predicate)).find(Boolean) ?? null;
const attr = (container, name) => find(container, (node) => node.props?.[name] !== undefined)?.props[name] ?? null;
const frameCommand = (frame, name) => frame.find((command) => command.name === name);
const errorText = (error) => error instanceof Error
  ? { name: error.name, message: error.message, stack: error.stack }
  : String(error);

const plugin = nativeModuleCompilerPlugin({ root, compilerBinary });
let dom, three, canvas, host, queue, borrowed, failureRoot, failureHost, retiringHost,
  unsubscribeStage, primaryError;
try {
  await mkdir(artifact, { recursive: true });
  const runtimeUrl = pathToFileURL(path.join(root, "src/native_runtime_api.ts")).href;
  const rows = [];
  for (const name of ["app", "scene"]) {
    const authoredPath = path.join(authoredDirectory, `${name}.tsx`);
    const authored = await readFile(authoredPath, "utf8");
    const source = authored.replaceAll('"@r3act/core"', JSON.stringify(runtimeUrl));
    const sourcePath = path.join(artifact, `${name}.tsx`);
    await writeFile(sourcePath, source, { flag: "wx" });
    const transformed = await plugin.transform.call({ addWatchFile() {},
      error(message) { throw new Error(String(message)); } }, source, sourcePath);
    assert.ok(transformed?.code, `${name} did not pass Rust/OXC`);
    assert.match(transformed.code, /registerCompiledSemanticPlan/);
    assert.match(transformed.code, /"module_revision"\s*:\s*"native-v1-[^"]+"/);
    for (const component of name === "app"
      ? ["DomApp", "CanvasApp", "CanvasRow"] : ["ThreeApp"])
      assert.match(transformed.code, new RegExp(`__nativeDefineComponent\\("[^"]*#component:${component}"`));
    await writeFile(path.join(artifact, `${name}.transformed.tsx`), transformed.code, { flag: "wx" });
    const emitted = await transformWithOxc(transformed.code, sourcePath,
      { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
    const executable = `import { jsx, Fragment } from ${JSON.stringify(runtimeUrl)};\n${emitted.code}`;
    await writeFile(path.join(artifact, `${name}.mjs`), executable, { flag: "wx" });
    rows.push({ name, authoredSha256: sha256(authored), transformedSha256: sha256(transformed.code),
      emittedSha256: sha256(executable) });
  }
  await writeFile(path.join(artifact, "provenance.json"), JSON.stringify({
    compilerSha256: sha256(await readFile(compilerBinary)),
    hostSha256: sha256(await readFile(path.join(authoredDirectory, "retained_host.ts"))), rows,
  }, null, 2) + "\n", { flag: "wx" });
  const app = await import(pathToFileURL(path.join(artifact, "app.mjs")).href);
  const sceneApp = await import(pathToFileURL(path.join(artifact, "scene.mjs")).href);
  const world = createWorld(), stage = createStore("A");
  const domHost = new MemoryVDOMHost(), domContainer = domHost.createContainer();
  dom = createNativeRoot(domHost, domContainer,
    { world, rootId: "compiled-custom-dom", scheduleCommit() {} });
  const scene = new THREE.Scene();
  three = createThreeNativeRoot(scene, { namespace: THREE,
    rootOptions: { world, rootId: "compiled-custom-three", scheduleCommit() {} } });
  host = new RetainedCanvasHost();
  const container = host.createContainer();
  canvas = createNativeRoot(host, container,
    { world, rootId: "compiled-custom-canvas", scheduleCommit() {} });
  const shared = new Brush("#4775ad"), owned = new Brush("#7d5fbd");
  borrowed = new Brush("#a65d4b");
  let brushes = {
    "shared-a": { brush: shared, ownership: "owned" },
    "shared-b": { brush: shared, ownership: "owned" },
    owned: { brush: owned, ownership: "owned" },
    borrowed: { brush: borrowed, ownership: "borrowed" },
  };
  const refs = Object.fromEntries(["shared-a", "shared-b", "owned", "borrowed"]
    .map((id) => [id, { current: null }]));
  const payloads = Object.fromEntries(Object.keys(refs).map((id) => [id, { label: id }]));
  const life = { mounts: 0, cleanups: 0 };
  let order = ["shared-a", "shared-b", "owned", "borrowed"];
  const domTree = () => jsx(app.DomApp, { stage });
  const threeTree = () => jsx(sceneApp.ThreeApp, { stage });
  const canvasTree = () => jsx(app.CanvasApp,
    { stage, rows: order, brushes, refs, payloads, life });
  const context = () => JSON.stringify({
    order, frame: host.frame(), host: host.diagnostics(), life, stageHead: stage.getState(),
    projected: [dom, three.root, canvas].map((root) => ({
      id: root.rootId, stage: stage.getStateForRoot(root.rootId), diagnostics: root.diagnostics(),
    })),
  });
  dom.mount(domTree()); three.root.mount(threeTree()); canvas.mount(canvasTree());
  assert.equal(attr(domContainer, "data-stage"), "A", context());
  assert.ok(scene.getObjectByName("stage-A"), context());
  assert.equal(frameCommand(host.frame(), "stage")?.text, "stage-A", context());
  assert.deepEqual(host.frame().filter((command) => command.kind === "rect").map((command) => command.name),
    order, context());
  assert.equal(host.diagnostics().liveBindings, 4, context());
  assert.equal(host.describePropertyWrite(refs.owned.current, "position", [1, 2]).valuePolicy, "copy");
  assert.equal(host.describePropertyWrite(refs.owned.current, "payload", payloads.owned).valuePolicy, "retain");
  assert.equal(host.describePropertyWrite(refs.owned.current, "brush", brushes.owned).valuePolicy, "copy");
  assert.equal(host.describePropertyWrite(refs.borrowed.current, "brush", brushes.borrowed)
    .valueResource.ownership, "borrowed");
  assert.equal(host.describePropertyWrite(refs["shared-a"].current, "brush", brushes["shared-a"])
    .valueResource.ownership, "shared-owned");
  const retained = refs["shared-a"].current;
  const probe = host.createElement("paintRect");
  const tuple = [9, 14];
  host.setProp(probe, "position", tuple);
  tuple[0] = 77;
  assert.deepEqual(probe.position, [9, 14], "position writer retained caller tuple");
  retiringHost = new RetainedCanvasHost();
  const retiringNode = retiringHost.createElement("paintRect");
  const retiringTuple = [0, 4];
  Object.defineProperty(retiringTuple, "0", { get() {
    retiringHost.dispose(retiringNode);
    return 8;
  } });
  let retirementError;
  try { retiringHost.setProp(retiringNode, "position", retiringTuple); }
  catch (error) { retirementError = error; }
  assert.match(String(retirementError), /disposed or foreign/,
    "tuple getter retired handle but host accepted the stale write");
  assert.deepEqual(retiringNode.position, [0, 0], "retired handle received a tuple write");
  assert.deepEqual(retiringHost.diagnostics(), { liveHandles: 0, liveResources: 0,
    ownedResources: 0, liveBindings: 0, eventRegistrations: 0 });
  retiringHost.dispose(); retiringHost = null;
  const adversarialBinding = { brush: shared, ownership: "owned" };
  host.setProp(probe, "brush", adversarialBinding);
  adversarialBinding.brush = borrowed;
  adversarialBinding.ownership = "borrowed";
  assert.equal(probe.brush.brush, shared, "host retained mutable binding wrapper");
  assert.equal(probe.brush.ownership, "owned", "caller mutation changed host resource ownership");
  host.dispose(probe);
  assert.equal(shared.disposeCalls, 0, "disposing probe released still-shared brush");
  assert.equal(retained.payload, payloads["shared-a"], "payload writer copied retained object");
  payloads["shared-a"].label = "mutated by caller";
  assert.equal(retained.payload.label, "mutated by caller", "retained payload lost caller identity");
  assert.equal(host.dispatch(retained), true);
  canvas.flush();
  assert.equal(frameCommand(host.frame(), "shared-a-label")?.text, "shared-a:1", context());
  order = ["borrowed", "owned", "shared-b", "shared-a"];
  canvas.update(canvasTree());
  assert.equal(refs["shared-a"].current, retained, "keyed move replaced public handle");
  assert.equal(frameCommand(host.frame(), "shared-a-label")?.text, "shared-a:1", context());
  assert.deepEqual(host.frame().filter((command) => command.kind === "rect").map((command) => command.name),
    order, context());
  order = order.filter((id) => id !== "shared-a");
  canvas.update(canvasTree());
  assert.equal(shared.disposeCalls, 0, "first shared binding disposed resource early");
  assert.equal(host.dispatch(retained), false, "removed row kept its event handler");
  assert.equal(refs["shared-a"].current, null, "removed row retained ref");
  order = order.filter((id) => id !== "shared-b");
  canvas.update(canvasTree());
  assert.equal(shared.disposeCalls, 1, "final shared binding did not dispose once");
  const replacement = new Brush("#227e70");
  brushes = { ...brushes, owned: { brush: replacement, ownership: "owned" } };
  canvas.update(canvasTree());
  assert.equal(owned.disposeCalls, 1, "owned replacement did not release old brush");
  assert.equal(frameCommand(host.frame(), "owned")?.color, replacement.color);
  assert.equal(borrowed.disposeCalls, 0, "host disposed borrowed brush");
  queue = new NativeRootWorkQueue();
  const publicationObservations = [];
  unsubscribeStage = stage.subscribe(canvas.rootId, () => {
    if (stage.getStateForRoot(canvas.rootId) !== "B") return;
    publicationObservations.push({
      domStage: attr(domContainer, "data-stage"),
      threeStage: scene.getObjectByName("custom-host-scene")?.children[0]?.name ?? null,
      canvasStage: frameCommand(host.frame(), "stage")?.text ?? null,
      versions: { dom: dom.version, three: three.root.version, canvas: canvas.version },
    });
  });
  stage.beginTransition("stage-B", [dom.rootId, three.root.rootId, canvas.rootId]);
  stage.dispatch("B", { kind: "transition", transitionId: "stage-B" });
  let resolveSettled;
  const settled = new Promise((resolve) => { resolveSettled = resolve; });
  queue.enqueue({ renderPreparation: "repeatable", id: "compiled-custom-stage-B", transitions: ["stage-B"],
    finishTransitions: true,
    roots: [{ root: dom, tree: domTree() }, { root: three.root, tree: threeTree() },
      { root: canvas, tree: canvasTree() }], onSettled: resolveSettled });
  const outcome = await withDeadline(settled, "three-root publication");
  assert.equal(outcome.status, "committed", JSON.stringify({ outcome: {
    ...outcome, error: errorText(outcome.error) }, context: context() }));
  assert.equal(attr(domContainer, "data-stage"), "B", context());
  assert.ok(scene.getObjectByName("stage-B"), context());
  assert.equal(frameCommand(host.frame(), "stage")?.text, "stage-B", context());
  assert.ok(publicationObservations.length > 0,
    `No post-publication Store subscriber observation: ${context()}`);
  for (const observation of publicationObservations) {
    assert.deepEqual([observation.domStage, observation.threeStage, observation.canvasStage],
      ["B", "stage-B", "stage-B"], JSON.stringify({ observation, context: context() }));
    assert.ok(Object.values(observation.versions).every((version) => version > 0),
      JSON.stringify(observation));
  }
  unsubscribeStage(); unsubscribeStage = null;
  assert.equal(borrowed.disposeCalls, 0);
  assert.equal(life.mounts - life.cleanups, order.length, context());
  queue.dispose(); queue = null;
  dom.dispose(); dom = null;
  three.dispose(); three = null;
  canvas.dispose(); canvas = null;
  host.dispose();
  assert.deepEqual(host.diagnostics(), { liveHandles: 0, liveResources: 0,
    ownedResources: 0, liveBindings: 0, eventRegistrations: 0 });
  assert.equal(replacement.disposeCalls, 1);
  assert.equal(borrowed.disposeCalls, 0, "host cleanup disposed borrowed brush");
  assert.equal(host.dispatch(retained), false, "disposed host delivered a stale event");
  borrowed.dispose(); borrowed = null;
  assert.equal(life.mounts, life.cleanups);
  assert.equal(stage.diagnostics().roots, 0);
  assert.equal(domContainer.children.length, 0);
  assert.equal(scene.children.length, 0);

  const setterError = new Error("controlled setter failure");
  const disposerError = new Error("controlled disposer failure");
  class ThrowingHost extends RetainedCanvasHost {
    armed = false;
    setProp(node, name, value, previous) {
      super.setProp(node, name, value, previous);
      if (this.armed && name === "width" && value === 99) {
        throw setterError;
      }
    }
  }
  failureHost = new ThrowingHost();
  const failureContainer = failureHost.createContainer();
  failureRoot = createNativeRoot(failureHost, failureContainer,
    { rootId: "compiled-custom-failure", scheduleCommit() {} });
  const failingBrush = new Brush("#983f60", () => { throw disposerError; });
  const otherBrush = new Brush("#407f87");
  const failureTree = (width) => jsx("paintLayer", { key: "root" }, [
    jsx("paintRect", { key: "first", name: "first", position: [1, 2], width,
      height: 10, brush: { brush: failingBrush, ownership: "owned" } }),
    jsx("paintRect", { key: "second", name: "second", position: [3, 4], width: 10,
      height: 10, brush: { brush: otherBrush, ownership: "owned" } }),
  ]);
  failureRoot.mount(failureTree(10));
  const acceptedVersion = failureRoot.version;
  failureHost.armed = true;
  const causes = (error) => error instanceof AggregateError
    ? error.errors.flatMap(causes)
    : [error];
  let writeFailure;
  try { failureRoot.update(failureTree(99)); } catch (error) { writeFailure = error; }
  assert.ok(causes(writeFailure).includes(setterError),
    `original setter error was lost: ${JSON.stringify(errorText(writeFailure))}`);
  assert.equal(frameCommand(failureHost.frame(), "first")?.width, 99,
    "partial physical host write was hidden after setter failure");
  assert.equal(failureRoot.version, acceptedVersion,
    "failed host write changed managed accepted version");
  assert.equal(failureRoot.snapshot[0].children[0].props.width, 10,
    "failed host write changed managed accepted snapshot");
  let terminalFailure;
  try { failureRoot.update(failureTree(12)); } catch (error) { terminalFailure = error; }
  assert.ok(terminalFailure, "quarantined root accepted a later publication");
  let cleanupFailure;
  try { failureRoot.dispose(); } catch (error) { cleanupFailure = error; }
  try { failureHost.dispose(); } catch (error) { cleanupFailure ??= error; }
  assert.ok(causes(cleanupFailure).includes(disposerError),
    `original disposer error was lost: ${JSON.stringify(errorText(cleanupFailure))}`);
  assert.equal(failingBrush.disposeCalls, 1, "throwing disposer was retried");
  assert.equal(otherBrush.disposeCalls, 1, "later owned cleanup was skipped");
  assert.deepEqual(failureHost.diagnostics(), { liveHandles: 0, liveResources: 0,
    ownedResources: 0, liveBindings: 0, eventRegistrations: 0 });
  console.log(JSON.stringify({ status: "PASS", artifact, actualCompiledExecution: true,
    source: rows, life }));
} catch (error) { primaryError = error; }
finally {
  const errors = [];
  for (const cleanup of [() => unsubscribeStage?.(), () => retiringHost?.dispose(),
    () => queue?.dispose(),
    () => failureRoot?.dispose(),
    () => failureHost?.dispose(), () => dom?.dispose(),
    () => three?.dispose(), () => canvas?.dispose(), () => host?.dispose(),
    () => borrowed?.dispose(), () => plugin.closeBundle?.()]) {
    try { await cleanup(); } catch (error) { errors.push(error); }
  }
  if (primaryError || errors.length) throw new AggregateError(
    [...(primaryError ? [primaryError] : []), ...errors],
    "Compiled custom host fixture failed");
}
