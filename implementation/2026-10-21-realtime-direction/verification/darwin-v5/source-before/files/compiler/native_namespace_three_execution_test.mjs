import assert from "node:assert/strict";
import * as THREE from "three";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import { nativeModulePlugin } from "./vite_native_plugin.ts";
import { nativeModuleCompilerPlugin } from "./vite_native_module.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";
import { jsx } from "../src/native_runtime_api.ts";

const directory = path.resolve(import.meta.dirname, "..");
const input = path.join(directory, ".cache/namespace-three-authored.tsx");
const output = path.join(directory, ".cache/namespace-three-authored.mjs");
const plugin = nativeModulePlugin({ root: directory });
const workbenchCompiler = nativeModuleCompilerPlugin({ root: directory });
const workbenchPath = path.join(directory, "src/browser/native_three_host.tsx");
const authored = `import { useEffect, useState } from "../src/native_runtime_api.ts";
export const frameTrace = { sceneRenders: 0, setEpoch: null, setPhase: null, setNested: null };
export function FrameMarker() {
  const [epoch, setEpoch] = useState(0);
  useEffect(() => { frameTrace.setEpoch = setEpoch; });
  return <group key="frame-marker" name="accepted-frame" position-x={epoch} />;
}
export function Motion(props) {
  const [phase, setPhase] = useState(0);
  useEffect(() => { frameTrace.setPhase = setPhase; });
  return <group key="motion" name={props.motionName} rotation-y={phase * 0.42}>
    {props.children}
  </group>;
}
export function NestedForm(props) {
  const [scale, setScale] = useState(1);
  useEffect(() => { frameTrace.setNested = setScale; });
  return <mesh key="nested" name={props.name} scale-x={scale} />;
}
export function FrameShell(props) {
  frameTrace.sceneRenders++;
  return <group key="frame-shell"><FrameMarker key="marker" />
    <Motion key="motion-owner" motionName="kinetic-form">
      <NestedForm key={props.replacement ? "replacement" : "first"}
        name={props.replacement ? "replacement" : "first"} />
    </Motion>
  </group>;
}
export function SceneView({ value, reset=false }) {
  return <group>
    <pointLight key="light" args={["orange", 2]} distance={reset ? undefined : value} position={reset ? undefined : [1,2,3]} shadow-mapSize={reset ? undefined : [1024,512]} />
    <orthographicCamera key="camera" zoom={reset ? undefined : value} />
    <mesh key="mesh" material-clearcoat={reset ? undefined : .65}>
      <icosahedronGeometry args={[1,2]} />
      <meshPhysicalMaterial color={reset ? undefined : "blue"} clearcoatRoughness={reset ? undefined : .25} />
    </mesh>
    <probeGroup key="custom" args={[7]} probeMode={reset ? undefined : value} />
  </group>;
}`;
class ProbeGroup extends THREE.Group {
  probeMode = 3;
  constructor(size) { super(); this.probeSize = size; }
}
let native, frameNative, proxyNative;
try {
  const workbenchSource = await readFile(workbenchPath, "utf8");
  const workbenchTransform = await workbenchCompiler.transform.call({
    addWatchFile() {}, error(message) { throw new Error(String(message)); },
  }, workbenchSource, workbenchPath);
  assert.ok(workbenchTransform?.code, "actual Three workbench did not pass Rust/OXC compilation");
  const workbenchAst = parse(workbenchTransform.code,
    { sourceType: "module", plugins: ["typescript", "jsx"] });
  const registrations = new Map();
  const kernelTables = new Map();
  const property = (node, name) => node?.type === "ObjectExpression" ?
    node.properties.find(entry => entry.type === "ObjectProperty" && !entry.computed &&
      (entry.key.name ?? entry.key.value) === name)?.value ?? null : null;
  const visit = node => {
    if (!node || typeof node !== "object") return;
    if (node.type === "VariableDeclarator" &&
      node.id?.type === "Identifier" && node.id.name.startsWith("__nativeOwnerCutKernels")) {
      const initializer = node.init?.type === "TSAsExpression" ? node.init.expression : node.init;
      assert.equal(initializer?.type, "ArrayExpression");
      kernelTables.set(node.id.name, initializer.elements);
    }
    if (node.type === "CallExpression" &&
      /^(?:__nativeDefineComponent_*)$/.test(node.callee?.name ?? "")) {
      const id = node.arguments[0]?.value;
      if (typeof id === "string" && id.includes("#component:"))
        registrations.set(id.split("#component:")[1], node.arguments[2]);
    }
    for (const [key, child] of Object.entries(node)) {
      if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === "object") visit(child);
    }
  };
  visit(workbenchAst);
  const programVersion = metadata => {
    const reference = property(metadata, "ownerUpdateProgram");
    assert.equal(reference?.type, "MemberExpression");
    assert.equal(reference.computed, true);
    const table = kernelTables.get(reference.object.name);
    assert.ok(table, "registered owner program must resolve to the emitted kernel table");
    return property(table[reference.property.value], "schemaVersion")?.value;
  };
  const frameMetadata = registrations.get("FrameMarker");
  assert.ok(frameMetadata, "FrameMarker missing from actual workbench semantic registration");
  assert.equal(programVersion(frameMetadata), 2,
    "ordinary FrameMarker must retain the v2 compiled owner program");
  const frameSites = property(frameMetadata, "propOnlySites");
  assert.ok(frameSites?.type === "ArrayExpression" && frameSites.elements.length > 0,
    "actual FrameMarker must retain a finite compiled prop-only site");
  assert.ok(registrations.has("KineticForm"),
    "workbench KineticForm must remain an authored compiler-registered wrapper");
  for (const name of ["SharedMotion", "OwnedMotion"]) {
    const metadata = registrations.get(name);
    assert.ok(metadata, `${name} missing from actual workbench semantic registration`);
    assert.equal(programVersion(metadata), 3,
      `${name} must bind retained children to a v3 owner program`);
    const sites = property(metadata, "propOnlySites");
    assert.ok(sites?.type === "ArrayExpression" && sites.elements.length > 0,
      `${name} must retain a finite compiled prop-only site`);
    const retained = property(metadata, "numericRetainedProps");
    assert.deepEqual(retained?.elements.map(element => element.value), ["children"],
      `${name} must mark direct opaque children as retained structural input`);
    const primitive = property(metadata, "numericPrimitiveProps");
    assert.deepEqual(primitive?.elements.map(element => element.value),
      ["id", "motionName", "x", "y"],
      `${name} must guard every primitive motion prop, including the effect's id`);
  }
  const authoredProof = await workbenchCompiler.transform.call({
    addWatchFile() {}, error(message) { throw new Error(String(message)); },
  }, authored, input);
  assert.ok(authoredProof?.code, "isolated retained-child control did not compile");
  visit(parse(authoredProof.code, { sourceType: "module", plugins: ["typescript", "jsx"] }));
  assert.equal(programVersion(registrations.get("Motion")), 3,
    "isolated Motion must bind direct JSX children to a v3 owner program");
  assert.equal(programVersion(registrations.get("FrameMarker")), 2,
    "isolated FrameMarker must retain its ordinary v2 owner program");
  const transformed = await plugin.transform.call({ addWatchFile() {}, error(message) { throw new Error(String(message)); } }, authored, input);
  assert.ok(transformed?.code);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, transformed.code);
  const app = await import(pathToFileURL(output).href + `?run=${Date.now()}`);
  const frameScene = new THREE.Scene(), frameCounters = [];
  const frameTotal = name => frameCounters.reduce((sum, frame) => sum + (frame[name] ?? 0), 0);
  frameNative = createThreeNativeRoot(frameScene, { namespace: THREE,
    rootOptions: { scheduleCommit() {}, profileCounter(frame) { frameCounters.push(frame); } } });
  frameNative.root.mount(jsx(app.FrameShell, { replacement: false }));
  const frameShell = frameScene.children[0];
  const [frameMarker, motion] = frameShell.children;
  const firstNested = motion.children[0];
  assert.equal(frameMarker.name, "accepted-frame");
  assert.equal(motion.name, "kinetic-form");
  assert.equal(firstNested.name, "first");
  assert.equal(app.frameTrace.sceneRenders, 1);
  assert.equal(typeof app.frameTrace.setEpoch, "function");
  assert.equal(typeof app.frameTrace.setPhase, "function");
  assert.equal(typeof app.frameTrace.setNested, "function");
  const batchesBeforeFrames = frameTotal("numeric.row-batches");
  const rendersBeforeFrames = frameTotal("owner.component-renders");
  for (let frame = 1; frame <= 4; frame++) {
    app.frameTrace.setEpoch(frame);
    app.frameTrace.setPhase(frame * 2);
    frameNative.root.flush();
    assert.equal(frameMarker.position.x, frame);
    assert.equal(motion.rotation.y, frame * 2 * 0.42);
    assert.equal(frameScene.children[0], frameShell);
    assert.deepEqual(frameShell.children, [frameMarker, motion]);
    assert.equal(motion.children[0], firstNested);
    assert.equal(app.frameTrace.sceneRenders, 1,
      "compiled child frame updates must not rerender the scene owner");
  }
  assert.equal(frameTotal("numeric.row-batches") - batchesBeforeFrames, 4,
    "each frame must publish one two-owner numeric row cut");
  assert.equal(frameTotal("owner.component-renders") - rendersBeforeFrames, 0,
    "frame marker and motion bodies must not rerender during frame-only updates");
  const batchesBeforeNested = frameTotal("numeric.row-batches");
  const rendersBeforeNested = frameTotal("owner.component-renders");
  app.frameTrace.setNested(3);
  frameNative.root.flush();
  assert.equal(firstNested.scale.x, 3);
  assert.equal(motion.children[0], firstNested,
    "nested child state retains its host and does not replace the motion owner");
  assert.equal(app.frameTrace.sceneRenders, 1);
  assert.equal(frameTotal("numeric.row-batches") - batchesBeforeNested, 1,
    "nested child state must use its own numeric owner cut");
  assert.equal(frameTotal("owner.component-renders") - rendersBeforeNested, 0,
    "nested child state must not rerender the retained motion owner");
  frameNative.root.update(jsx(app.FrameShell, { replacement: true }));
  assert.equal(frameScene.children[0], frameShell);
  assert.equal(frameShell.children[1], motion,
    "structural child replacement retains the motion host");
  assert.equal(motion.children[0].name, "replacement");
  assert.notEqual(motion.children[0], firstNested,
    "accepted structural replacement retires the previous nested child");
  const replacedSceneRenders = app.frameTrace.sceneRenders;
  const batchesBeforeReplacementFrame = frameTotal("numeric.row-batches");
  const rendersBeforeReplacementFrame = frameTotal("owner.component-renders");
  app.frameTrace.setPhase(12);
  frameNative.root.flush();
  assert.equal(motion.rotation.y, 12 * 0.42);
  assert.equal(app.frameTrace.sceneRenders, replacedSceneRenders,
    "post-replacement numeric motion update must not rerender the scene owner");
  assert.equal(frameTotal("numeric.row-batches") - batchesBeforeReplacementFrame, 1);
  assert.equal(frameTotal("owner.component-renders") - rendersBeforeReplacementFrame, 0);
  frameNative.dispose();
  assert.equal(frameScene.children.length, 0);
  assert.equal(frameNative.host.diagnostics.liveHandles, 0);
  frameNative = null;
  const proxyScene = new THREE.Scene(), proxyFrames = [];
  proxyNative = createThreeNativeRoot(proxyScene, { namespace: THREE,
    rootOptions: { scheduleCommit() {}, profileCounter(frame) { proxyFrames.push(frame); } } });
  const proxyChild = new Proxy(jsx(app.NestedForm, { name: "proxy-child" }), {});
  proxyNative.root.mount(jsx(app.Motion, {
    motionName: "opaque-motion", children: proxyChild,
  }));
  const proxyMotion = proxyScene.children[0];
  const proxySetter = app.frameTrace.setPhase;
  const proxyRendersBefore = proxyFrames.reduce((sum, frame) =>
    sum + (frame["owner.component-renders"] ?? 0), 0);
  proxySetter(2);
  proxyNative.root.flush();
  assert.equal(proxyMotion.rotation.y, 2 * 0.42);
  assert.ok(proxyFrames.reduce((sum, frame) =>
    sum + (frame["owner.component-renders"] ?? 0), 0) > proxyRendersBefore,
  "Proxy-wrapped child must keep the generic owner fallback");
  proxyNative.dispose();
  assert.equal(proxyScene.children.length, 0);
  proxyNative = null;
  const scene = new THREE.Scene();
  native = createThreeNativeRoot(scene, { namespace: { ...THREE, ProbeGroup } });
  const view = (value, reset=false) => jsx(app.SceneView, { value, reset });
  native.root.mount(view(4));
  const [light, camera, mesh, custom] = scene.children[0].children;
  assert.ok(light instanceof THREE.PointLight);
  assert.ok(camera instanceof THREE.OrthographicCamera);
  assert.ok(mesh.geometry instanceof THREE.IcosahedronGeometry);
  assert.ok(mesh.material instanceof THREE.MeshPhysicalMaterial);
  assert.ok(custom instanceof ProbeGroup);
  assert.equal(custom.probeSize, 7);
  assert.equal(custom.probeMode, 4);
  assert.equal(light.distance, 4);
  assert.deepEqual(light.position.toArray(), [1,2,3]);
  assert.deepEqual(light.shadow.mapSize.toArray(), [1024,512]);
  assert.equal(mesh.material.clearcoat, .65);
  assert.equal(mesh.material.clearcoatRoughness, .25);
  assert.equal(mesh.material.color.getHexString(), "0000ff");
  const projection = camera.projectionMatrix.clone();
  native.root.update(view(8));
  assert.equal(custom.probeMode, 8);
  assert.equal(light.distance, 8);
  assert.equal(camera.zoom, 8);
  assert.notDeepEqual(camera.projectionMatrix.toArray(), projection.toArray());
  assert.deepEqual(scene.children[0].children, [light, camera, mesh, custom]);
  native.root.update(view(8, true));
  assert.equal(custom.probeMode, 3);
  assert.equal(light.distance, 0);
  assert.deepEqual(light.position.toArray(), [0,0,0]);
  assert.deepEqual(light.shadow.mapSize.toArray(), [512,512]);
  assert.equal(camera.zoom, 1);
  assert.equal(mesh.material.clearcoat, 0);
  assert.equal(mesh.material.clearcoatRoughness, 0);
  assert.equal(mesh.material.color.getHexString(), "ffffff");
  // Generic vector copy/scalar conversion and method/unknown-field rejection.
  const group = native.host.createElement("Group", undefined);
  native.host.setProp(group, "position", new THREE.Vector3(4,5,6), undefined);
  native.host.setProp(group, "scale", 2, undefined);
  assert.deepEqual(group.object.position.toArray(), [4,5,6]);
  assert.deepEqual(group.object.scale.toArray(), [2,2,2]);
  assert.throws(() => native.host.setProp(group, "position", [1,2], undefined), /numeric array/);
  assert.deepEqual(group.object.position.toArray(), [4,5,6]);
  assert.throws(() => native.host.setProp(group, "notAProperty", 1, undefined), /Unsupported/);
  assert.throws(() => native.host.setProp(group, "updateMatrix", 1, undefined), /method/);
  assert.throws(() => native.host.createElement("MathUtils", undefined), /not.*constructor|not constructable/i);
  assert.throws(() => native.host.createElement("notAClass", undefined), /Unsupported/);
  native.host.dispose(group);
  const borrowedGeometry = new THREE.BoxGeometry();
  const firstMaterial = new THREE.MeshBasicMaterial({ color: "red" });
  const secondMaterial = new THREE.MeshBasicMaterial({ color: "green" });
  const arrayMesh = native.host.createElement("mesh", undefined, { args: [borrowedGeometry, [firstMaterial, secondMaterial]] });
  native.host.setProp(arrayMesh, "material-1-color", "blue", undefined);
  assert.equal(firstMaterial.color.getHexString(), "ff0000");
  assert.equal(secondMaterial.color.getHexString(), "0000ff");
  native.host.setProp(arrayMesh, "material-1-color", undefined, "blue");
  assert.equal(secondMaterial.color.getHexString(), "008000");
  native.host.dispose(arrayMesh);
  borrowedGeometry.dispose(); firstMaterial.dispose(); secondMaterial.dispose();
  const borrowedGroup = new THREE.Group();
  borrowedGroup.position.x = 3;
  let borrowedHandle = native.host.createElement("primitive", undefined, { object: borrowedGroup });
  native.host.setProp(borrowedHandle, "position-x", 8, undefined);
  native.host.setProp(borrowedHandle, "position-x", undefined, 8);
  assert.equal(borrowedGroup.position.x, 3);
  native.host.dispose(borrowedHandle);
  borrowedGroup.position.x = 11;
  borrowedHandle = native.host.createElement("primitive", undefined, { object: borrowedGroup });
  native.host.setProp(borrowedHandle, "position-x", 20, undefined);
  native.host.setProp(borrowedHandle, "position-x", undefined, 20);
  assert.equal(borrowedGroup.position.x, 11, "new handle reused a previous lifetime's default");
  native.host.dispose(borrowedHandle);
  native.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(native.host.diagnostics.liveHandles, 0);
  assert.equal(native.host.diagnostics.liveResources, 0);
  assert.equal(native.host.diagnostics.createdResources, native.host.diagnostics.disposedResources);
  assert.ok(!workbenchSource.includes("customFactories"), "demo still repeats IcosahedronGeometry construction");
  console.log("PASS namespace Three: actual compiled TSX, uncatalogued built-ins/custom class, generic props/nested paths/reset/identity/projection/teardown; no custom factory or property writer.");
} finally {
  native?.dispose();
  frameNative?.dispose();
  proxyNative?.dispose();
  await plugin.closeBundle?.call({});
  await workbenchCompiler.closeBundle?.call({});
}
