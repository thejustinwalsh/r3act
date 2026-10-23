import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { transformWithOxc } from "vite";
import * as THREE from "three";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { createNativeRoot, jsx, storeRecord } from "../src/native_runtime_api.ts";
import { invalidateCompiledSemanticPlan } from "../src/compiled_semantic_plan.ts";
import { copyRuntimeElement } from "../src/jsx_binding_runtime.ts";
import { OwnedScalarFrame, OwnedScalarLayout } from "../src/closed_scalar_output.ts";
import { MemoryVDOMHost, VDOMSnapshotRoot } from "../src/vdom_snapshot_runtime.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";

const rootPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtime = pathToFileURL(path.join(rootPath, "src/native_runtime_api.ts")).href;
const binary = path.join(rootPath, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const artifact = path.join(rootPath, ".cache", `compiled-owned-frame-${randomUUID()}`);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const source = `/** @jsxRuntime classic */
/** @jsx jsx */
// @native-ui
import { createStore, storeRecord, use, useState, useEffect, jsx } from ${JSON.stringify(runtime)};
export const clock = createStore(storeRecord({ phase: 0 }));
export const replacementClock = createStore(storeRecord({ phase: 20 }));
export const resourceClock = createStore(storeRecord({ phase: 20 }));
export const controls = {};
export function Motion(props) {
  const frame = use(props.clock);
  const [offset, setOffset] = useState(0);
  useEffect(() => { controls[props.id] = setOffset; return () => { delete controls[props.id]; }; });
  return <group key="motion" position-z={0.5} position-x={frame.phase * 2 + offset}>{props.children}</group>;
}
export function Alternate(props) {
  const frame = use(props.clock);
  const [offset, setOffset] = useState(0);
  useEffect(() => { controls[props.id] = setOffset; return () => { delete controls[props.id]; }; });
  return <group key="motion" position-z={0.5} position-x={frame.phase * 3 + offset}>{props.children}</group>;
}
export function Marker(props) {
  const frame = use(props.clock);
  return <group key="marker" name="accepted-bound-frame" visible={true} position-z={0.5} position-x={frame.phase} />;
}`;
const counters = {};
const profileCounter = batch => {
  for (const [name, count] of Object.entries(batch)) counters[name] = (counters[name] ?? 0) + count;
};
const reset = () => { for (const name of Object.keys(counters)) delete counters[name]; };
const property = (node, name) => node?.type === "ObjectExpression"
  ? node.properties.find(item => !item.computed && (item.key?.name ?? item.key?.value) === name)?.value
  : undefined;
const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [name, value] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments"].includes(name)) continue;
    if (Array.isArray(value)) value.forEach(item => visit(item, callback));
    else if (value && typeof value === "object") visit(value, callback);
  }
};
class ObservingHost extends MemoryVDOMHost {
  onWrite;
  failAt = 0;
  writes = 0;
  setProp(node, name, value, previous) {
    super.setProp(node, name, value, previous);
    if (name === "position-x") {
      this.writes++;
      this.onWrite?.();
      if (this.writes === this.failAt) throw new Error("second scalar writer failed");
    }
  }
}
const roots = [];
let plugin, primaryError;
try {
  await mkdir(artifact, { recursive: true });
  const sourcePath = path.join(artifact, "authored.tsx");
  await writeFile(sourcePath, source, { flag: "wx" });
  plugin = nativeModuleCompilerPlugin({ root: rootPath, compilerBinary: binary });
  const transformed = await plugin.transform.call({ addWatchFile() {},
    error(message) { throw new Error(String(message)); } }, source, sourcePath);
  assert.ok(transformed?.code);
  const ast = parse(transformed.code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  let plan;
  const selected = [];
  visit(ast, node => {
    if (node.type === "CallExpression" && node.callee?.name === "__registerNativeSemanticPlan")
      plan = node.arguments[0];
    if (node.type !== "CallExpression" || !/^__nativeDefineComponent_*$/.test(node.callee?.name ?? "")) return;
    const execution = property(node.arguments[2], "closedStoreExecution");
    if (!execution) return;
    const name = node.arguments[0].value.split("#component:").at(-1);
    const program = property(node.arguments[2], "closedStoreHostProgram");
    assert.equal(property(property(program, "host"), "key")?.value,
      name === "Marker" ? "marker" : "motion");
    assert.equal(property(program, "schemaVersion")?.value,
      name === "Marker" ? 5 : 7);
    assert.equal(property(execution, "schemaVersion")?.value, 3);
    assert.equal(property(execution, "batchKernel")?.type, "ArrowFunctionExpression");
    assert.equal(property(execution, "numericKernel"), undefined);
    selected.push(name);
  });
  assert.deepEqual(selected.sort(), ["Alternate", "Marker", "Motion"]);
  assert.match(transformed.code, /position-z/,
    "compiled host metadata must retain the numeric literal");
  const sourceFile = property(plan, "source_file")?.value;
  const revision = property(plan, "module_revision")?.value;
  assert.equal(typeof sourceFile, "string");
  assert.equal(typeof revision, "string");
  await writeFile(path.join(artifact, "transformed.tsx"), transformed.code, { flag: "wx" });
  const emitted = await transformWithOxc(transformed.code, sourcePath,
    { lang: "tsx", jsx: { runtime: "classic", pragma: "jsx", pragmaFrag: "Fragment" } });
  const modulePath = path.join(artifact, "compiled.mjs");
  await writeFile(modulePath, emitted.code, { flag: "wx" });
  const app = await import(pathToFileURL(modulePath).href);
  const tree = (clock = app.clock) => jsx("group", { key: "scene" }, [
    jsx(app.Marker, { key: "marker-owner", clock }),
    jsx(app.Motion, { key: "a", id: "a", clock,
      children: jsx("mesh", { key: "a-child", name: "retained-a" }) }),
    jsx(app.Alternate, { key: "b", id: "b", clock,
      children: jsx("mesh", { key: "b-child", name: "retained-b" }) }),
  ]);
  const make = label => {
    const host = new ObservingHost(), container = host.createContainer();
    const root = createNativeRoot(host, container,
      { rootId: `${label}-${randomUUID()}`, scheduleCommit() {}, profileCounter });
    roots.push(root); root.mount(tree());
    return { root, host, container };
  };
  const current = make("compact-primary");
  const nodes = [...current.container.children[0].children];
  const children = [nodes[1].children[0], nodes[2].children[0]];
  const controls = { ...app.controls };
  const values = () => nodes.map(node => node.props["position-x"]);
  const step = phase => {
    reset(); app.clock.dispatch(() => storeRecord({ phase }));
    assert.equal(current.root.flush(), true);
    assert.equal(counters["store.owned-data.verified-rows"], 3);
    assert.equal(counters["store.scalar-output.pages"], 3);
    assert.equal(counters["store.scalar-output.root-materializations"] ?? 0, 0);
    assert.equal(counters["owner.component-renders"] ?? 0, 0);
    assert.equal(nodes[0].props.name, "accepted-bound-frame");
  };
  step(1);
  assert.equal(counters["store.scalar-output.frames"] ?? 0, 0);
  assert.equal(counters["store.mounted-frame.direct-cuts"], 1);
  assert.equal(counters["store.mounted-frame.mounted-targets"], 3);
  assert.equal(counters["store.scalar-output.prop-materializations"] ?? 0, 0,
    "unobserved compact publication must not construct ordinary props");
  const accepted = current.root.snapshot, saved = JSON.stringify(accepted);
  let observations = 0;
  current.host.onWrite = () => {
    observations++;
    assert.equal(JSON.stringify(current.root.snapshot), saved,
      "managed reads during application must retain the old accepted view");
  };
  step(2); current.host.onWrite = undefined;
  assert.equal(counters["store.scalar-output.frames"] ?? 0, 0);
  assert.equal(observations, 3);
  assert.equal(counters["store.mounted-scalar.warm-rows"], 3);
  assert.equal(counters["store.mounted-scalar.cold-rows"] ?? 0, 0);
  assert.equal(counters["store.bound-input.reused-rows"], 3);
  assert.equal(counters["store.bound-input.new-rows"] ?? 0, 0);
  assert.equal(counters["store.bound-input.allocated-records"] ?? 0, 0);
  assert.equal(counters["store.scalar-output.pages"], 3);
  for (const node of nodes) {
    assert.equal(node.props["position-z"], 0.5);
  }
  assert.equal(nodes[0].props.name, "accepted-bound-frame");
  assert.equal(nodes[0].props.visible, true);
  assert.deepEqual(values(), [2, 4, 6]);
  assert.equal(JSON.stringify(accepted), saved, "a saved snapshot must not mutate later");
  current.host.onWrite = () => {
    current.host.onWrite = undefined;
    app.clock.dispatch(() => storeRecord({ phase: 4 }));
    assert.equal(controls.b(3), true,
      "accepted local setter must queue a newer action during publication");
  };
  step(3);
  assert.deepEqual(values(), [3, 6, 9], "newer setter action must not overwrite the admitted cut");
  assert.equal(current.root.flush(), true);
  assert.deepEqual(values(), [4, 8, 15], "newer Store and local actions must survive old-cut acknowledgement");
  controls.a(2); assert.equal(current.root.flush(), true);
  assert.deepEqual(values(), [4, 10, 15]);
  step(5); step(6);
  assert.equal(counters["store.mounted-scalar.warm-rows"], 3);
  assert.deepEqual(values(), [6, 14, 21]);
  assert.equal(nodes[1].children[0], children[0]);
  assert.equal(nodes[2].children[0], children[1]);
  const fork = make("compact-fork");
  const forkNodes = [...fork.container.children[0].children];
  step(7);
  assert.deepEqual(forkNodes.map(node => node.props["position-x"]), [6, 12, 18]);
  assert.equal(fork.root.flush(), true);
  assert.deepEqual(forkNodes.map(node => node.props["position-x"]), [7, 14, 21]);
  const observedBefore = current.root.snapshot;
  const observedBytes = JSON.stringify(observedBefore);
  reset(); current.root.render(tree());
  assert.ok((counters["store.scalar-output.root-materializations"] ?? 0) > 0,
    "public generic render must materialize the accepted scalar output");
  assert.ok((counters["store.scalar-output.prop-materializations"] ?? 0) > 0);
  assert.equal(JSON.stringify(observedBefore), observedBytes);
  assert.deepEqual(values(), [7, 16, 24]);
  assert.equal(typeof globalThis.gc, "function", "retention fixture requires --expose-gc");
  const removedReferences = (() => {
    const retained = make("compact-retention");
    app.clock.dispatch(() => storeRecord({ phase: 9 })); retained.root.flush();
    reset(); app.clock.dispatch(() => storeRecord({ phase: 10 })); retained.root.flush();
    assert.equal(counters["store.mounted-scalar.warm-rows"], 3);
    const removed = retained.container.children[0].children[2];
    const payload = { tag: "removed-mounted-payload" };
    removed.payload = payload;
    const references = { node: new WeakRef(removed), payload: new WeakRef(payload),
      control: new WeakRef({ control: true }) };
    retained.root.update(jsx("group", { key: "scene" }, [
      jsx(app.Marker, { key: "marker-owner", clock: app.clock }),
      jsx(app.Motion, { key: "a", id: "a", clock: app.clock,
        children: jsx("mesh", { key: "a-child", name: "retained-a" }) }),
    ]));
    assert.equal(retained.container.children[0].children.length, 2);
    retained.root.update(tree());
    assert.equal(retained.container.children[0].children.length, 3);
    assert.notEqual(retained.container.children[0].children[2], removed,
      "keyed reinsertion must mount a new target");
    return references;
  })();
  const peerReferences = (() => {
    const host = new MemoryVDOMHost(), container = host.createContainer();
    const root = new VDOMSnapshotRoot(host, container); roots.push(root);
    const tree = owners => jsx("main", {}, owners.map(owner => jsx("section", { key: `slot-${owner}` },
      copyRuntimeElement("group", { key: "shared-motion", "rotation-y": 0,
        children: jsx("mesh", { key: `child-${owner}` }) }, owner))));
    root.commit(tree([1, 2]));
    const layout = OwnedScalarLayout.create(["rotation-y"], [undefined]);
    const regions = [1, 2].map(owner => Object.freeze({
      key: "shared-motion", tag: "group", componentOwner: owner,
      retainedChildren: true, kind: "frame", frame: OwnedScalarFrame.create(layout, [owner]),
    }));
    const cut = root.prepareScopedKeyedRetainedAndStoreDeltas([], [], regions);
    assert.ok(cut); assert.equal(cut.validate(), true);
    const survivor = cut.storeScalarPlans?.[0]; assert.ok(survivor);
    root.beginPublication(); cut.commit(); assert.equal(cut.validatePostHost(), true);
    root.publishAccepted(); cut.discard();
    assert.equal(cut.storeScalarPlans, undefined);
    const removed = container.children[0].children[1].children[0];
    const payload = { tag: "same-key-peer-payload" }; removed.payload = payload;
    const references = { node: new WeakRef(removed), payload: new WeakRef(payload), survivor };
    root.commit(tree([1]));
    return references;
  })();
  for (let cycle = 0; cycle < 12; cycle++) {
    await new Promise(resolve => setImmediate(resolve)); globalThis.gc();
  }
  assert.equal(removedReferences.control.deref(), undefined, "GC control did not collect");
  assert.equal(removedReferences.node.deref(), undefined, "accepted plans retained a removed target");
  assert.equal(removedReferences.payload.deref(), undefined, "accepted plans retained removed payload");
  assert.ok(peerReferences.survivor, "surviving owner recipe must remain retained");
  assert.equal(peerReferences.node.deref(), undefined, "same-key recipe retained a removed peer");
  assert.equal(peerReferences.payload.deref(), undefined, "same-key recipe retained removed peer payload");
  const manyCounters = {};
  const manyProfile = batch => {
    for (const [name, count] of Object.entries(batch))
      manyCounters[name] = (manyCounters[name] ?? 0) + count;
  };
  const resetMany = () => { for (const name of Object.keys(manyCounters)) delete manyCounters[name]; };
  const manyTree = extraPeer => jsx("group", { key: "many-scene" }, [
    jsx("section", { key: "marker-slot" },
      jsx(app.Marker, { key: "marker-owner", clock: app.clock })),
    ...Array.from({ length: extraPeer ? 257 : 256 }, (_, id) =>
      jsx("section", { key: `slot-${id}` },
        jsx(id % 2 === 0 ? app.Motion : app.Alternate,
          { key: `owner-${id}`, id: `many-${id}`, clock: app.clock,
            children: jsx("mesh", { key: `child-${id}`, name: `retained-${id}` }) }))),
  ]);
  const manyHost = new ObservingHost(), manyContainer = manyHost.createContainer();
  const manyRoot = createNativeRoot(manyHost, manyContainer,
    { rootId: `compact-many-${randomUUID()}`, scheduleCommit() {}, profileCounter: manyProfile });
  roots.push(manyRoot); manyRoot.mount(manyTree(false));
  const manySlots = () => manyContainer.children[0].children;
  const manyMotion = () => manySlots().slice(1).map(slot => slot.children[0]);
  const manyTargets = manyMotion(), manyChildren = manyTargets.map(node => node.children[0]);
  assert.equal(manyTargets.length, 256);
  assert.equal(manySlots()[0].children[0].props.name, "accepted-bound-frame");
  const manyStep = (phase, expectedWarm) => {
    resetMany(); app.clock.dispatch(() => storeRecord({ phase }));
    assert.equal(manyRoot.flush(), true);
    assert.equal(manyCounters["store.owned-data.verified-rows"], 257);
    assert.equal(manyCounters["store.scalar-output.frames"] ?? 0, 0);
    assert.equal(manyCounters["store.scalar-output.pages"], 3);
    assert.equal(manyCounters["store.scalar-output.root-materializations"] ?? 0, 0);
    assert.equal(manyCounters["store.scalar-output.prop-materializations"] ?? 0, 0);
    assert.equal(manyCounters["owner.component-renders"] ?? 0, 0);
    assert.equal(manyCounters["store.scalar-target.bucket-builds"] ?? 0, 0);
    for (const name of ["member-visits", "owner-index-visits"])
      assert.equal(manyCounters[`store.scalar-target.${name}`] ?? 0, 0);
    assert.equal(manyCounters["store.scalar-target.owner-lookups"] ?? 0, 0);
    assert.equal(manyCounters["store.mounted-frame.mounted-targets"], 257);
    assert.equal(manyCounters["store.mounted-frame.direct-cuts"], 1);
    if (expectedWarm === 257)
      assert.equal(manyCounters["store.mounted-execution.reused"], 1);
    assert.equal(manyCounters["store.mounted-scalar.warm-rows"] ?? 0, expectedWarm);
    assert.equal(manyCounters["store.mounted-scalar.cold-rows"] ?? 0, 257 - expectedWarm);
    if (expectedWarm === 257) {
      assert.equal(manyCounters["store.reader-staging.owned-direct-rows"], 257);
      assert.equal(manyCounters["store.reader-staging.generic-materializations"] ?? 0, 0);
      assert.equal(manyCounters["store.world-cut.producer-reuse"], 1);
      assert.equal(manyCounters["store.scalar-target.full-prepared-sweeps"], 1);
      assert.equal(manyCounters["store.scalar-target.full-post-host-sweeps"], 1);
      assert.equal(manyCounters["publication.owned-scalar-phase-runs"], 1);
    }
    assert.equal(manySlots()[0].children[0].props.name, "accepted-bound-frame");
    assert.equal(manySlots()[0].children[0].props["position-x"], phase);
    for (const [id, node] of manyMotion().entries()) {
      assert.equal(node, manyTargets[id], `motion target ${id} must retain identity`);
      assert.equal(node.children[0], manyChildren[id], `authored child ${id} must retain identity`);
    }
    assert.deepEqual(manyTargets.map(node => node.props["position-x"]),
      Array.from({ length: 256 }, (_, id) => phase * (id % 2 === 0 ? 2 : 3)));
  };
  manyStep(11, 0);
  assert.ok((manyCounters["store.bound-input.allocated-records"] ?? 0) > 0,
    "cold admission must count real input records");
  manyStep(12, 257);
  assert.equal(manyCounters["store.bound-input.allocated-records"] ?? 0, 0);
  assert.equal(manyCounters["store.scalar-output.pages"], 3);
  manyStep(13, 257);
  const scene = new THREE.Scene();
  const threeCounters = {};
  const threeProfile = batch => {
    for (const [name, count] of Object.entries(batch))
      threeCounters[name] = (threeCounters[name] ?? 0) + count;
  };
  const resetThree = () => {
    for (const name of Object.keys(threeCounters)) delete threeCounters[name];
  };
  const three = createThreeNativeRoot(scene, { namespace: THREE, rootOptions: {
    rootId: `owned-frame-three-${randomUUID()}`, scheduleCommit() {},
    profileCounter: threeProfile,
  } });
  roots.push(three.root);
  three.root.mount(jsx(app.Motion, { key: "three-owner", id: "three", clock: app.resourceClock,
    children: jsx("mesh", { key: "retained-resource", children: [
      jsx("boxGeometry", { args: [1, 1, 1] }),
      jsx("meshStandardMaterial", { color: "orange" }),
    ] }) }));
  const threeGroup = scene.children[0], mesh = threeGroup.children[0];
  assert.ok(mesh instanceof THREE.Mesh);
  const geometry = mesh.geometry, material = mesh.material;
  const disposed = { geometry: 0, material: 0 };
  geometry.addEventListener("dispose", () => disposed.geometry++);
  material.addEventListener("dispose", () => disposed.material++);
  assert.equal(app.controls.three(1), true);
  assert.equal(three.root.flush(), true);
  assert.equal(threeGroup.position.x, 41);
  resetThree();
  app.resourceClock.dispatch(() => storeRecord({ phase: 21 }));
  assert.equal(three.root.flush(), true);
  assert.equal(threeGroup.position.x, 43);
  assert.equal(threeCounters["store.reader-staging.owned-direct-rows"], 1);
  assert.equal(threeCounters["store.reader-staging.generic-materializations"] ?? 0, 0);
  assert.equal(threeCounters["store.world-cut.producer-reuse"], 1);
  assert.equal(threeCounters["store.scalar-target.full-prepared-sweeps"], 1);
  assert.equal(threeCounters["store.scalar-target.full-post-host-sweeps"], 1);
  assert.equal(threeCounters["publication.owned-scalar-phase-runs"], 1);
  assert.equal(scene.children[0], threeGroup);
  assert.equal(threeGroup.children[0], mesh);
  assert.equal(mesh.geometry, geometry);
  assert.equal(mesh.material, material);
  assert.deepEqual(disposed, { geometry: 0, material: 0 });
  three.root.dispose();
  assert.deepEqual(disposed, { geometry: 1, material: 1 });
  app.controls["many-0"](2); app.controls["many-1"](3);
  assert.equal(manyRoot.flush(), true);
  assert.equal(manyTargets[0].props["position-x"], 28);
  assert.equal(manyTargets[1].props["position-x"], 42);
  for (const [id, node] of manyTargets.entries())
    assert.equal(node.children[0], manyChildren[id], `local offset must retain child ${id}`);
  manyRoot.update(manyTree(true));
  assert.equal(manyMotion().length, 257);
  const beforeChurnStep = manyMotion().map(node => node.props["position-x"]);
  app.clock.dispatch(() => storeRecord({ phase: 14 }));
  assert.equal(manyRoot.flush(), true);
  assert.equal(manySlots()[0].children[0].props["position-x"], 14);
  assert.deepEqual(manyMotion().map((node, id) => node.props["position-x"] - beforeChurnStep[id]),
    Array.from({ length: 257 }, (_, id) => id % 2 === 0 ? 2 : 3),
    "same-key peer insertion must update each current owner, regardless of generic replacement");
  resetMany(); app.clock.dispatch(() => storeRecord({ phase: 15 }));
  assert.equal(manyRoot.flush(), true);
  assert.equal(manyCounters["store.owned-data.verified-rows"], 258);
  assert.equal(manyCounters["store.scalar-output.frames"] ?? 0, 0);
  assert.equal(manyCounters["store.scalar-output.pages"], 3);
  assert.equal(manyCounters["store.scalar-output.root-materializations"] ?? 0, 0);
  assert.equal(manyCounters["store.scalar-output.prop-materializations"] ?? 0, 0);
  assert.equal(manyCounters["owner.component-renders"] ?? 0, 0);
  assert.equal(manyCounters["store.scalar-target.bucket-builds"] ?? 0, 0);
  for (const name of ["member-visits", "owner-index-visits"])
    assert.equal(manyCounters[`store.scalar-target.${name}`] ?? 0, 0);
  assert.equal(manyCounters["store.scalar-target.owner-lookups"] ?? 0, 0);
  assert.equal(manyCounters["store.mounted-frame.mounted-targets"], 258);
  assert.equal(manyCounters["store.mounted-frame.direct-cuts"], 1);
  assert.equal(manyCounters["store.mounted-execution.reused"], 1);
  assert.equal(manyCounters["store.mounted-scalar.warm-rows"], 258);
  assert.equal(manySlots()[0].children[0].props["position-x"], 15);
  const changedChild = make("owned-frame-child-change");
  const oldChild = changedChild.container.children[0].children[1].children[0];
  changedChild.root.update(jsx("group", { key: "scene" }, [
    jsx(app.Marker, { key: "marker-owner", clock: app.clock }),
    jsx(app.Motion, { key: "a", id: "a", clock: app.clock,
      children: jsx("mesh", { key: "new-child", name: "replacement" }) }),
    jsx(app.Alternate, { key: "b", id: "b", clock: app.clock,
      children: jsx("mesh", { key: "b-child", name: "retained-b" }) }),
  ]));
  assert.notEqual(changedChild.container.children[0].children[1].children[0], oldChild);
  const sourceReplacement = make("capture-source-replacement");
  sourceReplacement.root.update(tree(app.replacementClock));
  app.replacementClock.dispatch(() => storeRecord({ phase: 21 }));
  assert.equal(sourceReplacement.root.flush(), true);
  assert.deepEqual(sourceReplacement.container.children[0].children.map(node =>
    node.props["position-x"]), [21, 42, 63]);
  const replacementBytes = JSON.stringify(sourceReplacement.root.snapshot);
  app.clock.dispatch(() => storeRecord({ phase: 16 }));
  sourceReplacement.root.flush();
  assert.equal(changedChild.root.flush(), true);
  assert.equal(changedChild.container.children[0].children[1].children[0].props.name,
    "replacement");
  assert.equal(JSON.stringify(sourceReplacement.root.snapshot), replacementBytes,
    "old Store source must not advance a replaced owner");
  const failed = make("capture-failed-writer");
  const failedAccepted = failed.root.snapshot;
  const failedBytes = JSON.stringify(failedAccepted);
  failed.host.writes = 0;
  failed.host.failAt = 2;
  failed.host.onWrite = () => assert.equal(JSON.stringify(failed.root.snapshot),
    failedBytes, "first and second host writers must see old accepted history");
  app.clock.dispatch(() => storeRecord({ phase: 17 }));
  assert.throws(() => failed.root.flush(), /second scalar writer failed/);
  assert.equal(failed.host.writes, 2);
  assert.equal(JSON.stringify(failed.root.snapshot), failedBytes,
    "partial host failure advanced accepted history");
  assert.equal(JSON.stringify(failedAccepted), failedBytes);
  assert.throws(() => failed.root.flush(), /host commit failure|terminal|quarantin/i);
  app.clock.dispatch(() => storeRecord({ phase: 8 }));
  const stale = current.root.prepareStores([app.clock]);
  assert.ok(stale); assert.equal(stale.validate(), true);
  assert.equal(invalidateCompiledSemanticPlan(sourceFile, revision), true);
  assert.equal(stale.validate(), false);
  assert.deepEqual(values(), [7, 16, 24]); stale.discard();
  await writeFile(path.join(artifact, "result.json"), JSON.stringify({ status: "PASS",
    compilerSha256: sha(await readFile(binary)), sourceSha256: sha(source),
    transformedSha256: sha(transformed.code), selected,
    assertions: ["actual schema2 arithmetic and numeric literal mapping", "compact frame rows without warm ordinary output",
      "positive public generic materialization", "warm input and mounted reuse", "immutable applying snapshots",
      "newer Store and local reentrant actions", "local offsets and retained children", "independent accepted roots",
      "bounded removed-target and same-key peer retention with roots alive", "source replacement and keyed reinsertion", "second writer failure quarantine", "stale code retirement",
      "compiled 256-owner shared-key current indexing", "accepted same-key peer insertion",
      "retained Three mesh resources and exact disposal"],
  }, null, 2) + "\n", { flag: "wx" });
  console.log(`PASS actual compiled owned frame transaction; provenance: ${artifact}`);
} catch (error) { primaryError = error; }
const cleanup = [];
for (const root of roots.reverse()) {
  try { root.dispose(); } catch (error) { cleanup.push(error); }
}
try { await plugin?.closeBundle(); } catch (error) { cleanup.push(error); }
if (primaryError && cleanup.length) throw new AggregateError([primaryError, ...cleanup],
  "Compiled owned frame transaction and cleanup failed", { cause: primaryError });
if (primaryError) throw primaryError;
if (cleanup.length) throw new AggregateError(cleanup, "Compiled owned frame transaction cleanup failed");
