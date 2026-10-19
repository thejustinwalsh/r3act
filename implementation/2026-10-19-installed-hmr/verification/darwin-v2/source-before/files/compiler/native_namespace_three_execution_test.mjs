import assert from "node:assert/strict";
import * as THREE from "three";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { nativeModulePlugin } from "./vite_native_plugin.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";
import { jsx } from "../src/native_runtime_api.ts";

const directory = path.resolve(import.meta.dirname, "..");
const input = path.join(directory, ".cache/namespace-three-authored.tsx");
const output = path.join(directory, ".cache/namespace-three-authored.mjs");
const plugin = nativeModulePlugin({ root: directory });
const authored = `import { useState } from "../src/native_runtime_api.ts";
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
let native;
try {
  const transformed = await plugin.transform.call({ addWatchFile() {}, error(message) { throw new Error(String(message)); } }, authored, input);
  assert.ok(transformed?.code);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, transformed.code);
  const app = await import(pathToFileURL(output).href + `?run=${Date.now()}`);
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
  const demo = await readFile(path.join(directory, "src/browser/native_three_host.tsx"), "utf8");
  assert.ok(!demo.includes("customFactories"), "demo still repeats IcosahedronGeometry construction");
  console.log("PASS namespace Three: actual compiled TSX, uncatalogued built-ins/custom class, generic props/nested paths/reset/identity/projection/teardown; no custom factory or property writer.");
} finally {
  native?.dispose();
  await plugin.closeBundle?.call({});
}
