import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Vector2,
} from "three";
import { createNativeRoot, jsx } from "../src/native_runtime_api.ts";
import { createThreeHost, createThreeNativeRoot, raycastThreePointer } from "../src/three_host.ts";
import { nativeModulePlugin } from "./vite_native_plugin.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceId = path.join(projectRoot, ".cache/three-host-scene.tsx");
const outputPath = path.join(projectRoot, ".cache/three-host-scene.mjs");
const source = `import { BoxGeometry, MeshStandardMaterial } from "three";
import { useState } from "../src/native_runtime_api.ts";
export let pointerEventCount = 0;
export function NativeScene({ x, roughness, order, show, reset = false, materialKey }) {
  const [clicks, setClicks] = useState(0);
  const mesh = show ? <mesh key="mesh" position-x={reset ? undefined : x} material-roughness={reset ? undefined : roughness} onPointerDown={() => { pointerEventCount++; setClicks((value) => value + 1); }}>
    <boxGeometry args={[1, 2, 3]} />
    <meshStandardMaterial key={materialKey} color="orange" />
  </mesh> : null;
  const light = <directionalLight key="light" intensity={2} />;
  return <group>{order === "mesh-first" ? [mesh, light] : [light, mesh]}</group>;
}
export const sharedGeometry = new BoxGeometry(2, 2, 2);
export const sharedMaterial = new MeshStandardMaterial({ color: "blue" });
export function CameraScene({ fov }) {
  return <perspectiveCamera fov={fov} />;
}
export function SharedScene() {
  return <mesh key="shared">
    <primitive object={sharedGeometry} attach="geometry" />
    <primitive object={sharedMaterial} attach="material" />
  </mesh>;
}
export function CleanupScene() {
  return <group><mesh onPointerDown={() => {}}>
    <throwingGeometry />
    <meshStandardMaterial />
  </mesh><mesh><boxGeometry /><meshStandardMaterial /></mesh></group>;
}`;

const plugin = nativeModulePlugin();
plugin.configResolved.call({}, { root: projectRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    if (specifier === "../src/native_runtime_api.ts") {
      return { id: path.join(projectRoot, "src/native_runtime_api.ts") };
    }
    return null;
  },
  error(message) {
    throw new Error(String(message));
  },
};
try {
  const transformed = await plugin.transform.call(context, source, sourceId);
  assert.ok(transformed?.code);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, transformed.code);
} finally {
  plugin.closeBundle?.call({});
}

const compiled = await import(`${pathToFileURL(outputPath).href}?run=${Date.now()}`);
const scene = new Group();
const native = createThreeNativeRoot(scene);
const render = (props) => native.root.render(jsx(compiled.NativeScene, props));
render({ x: 4, roughness: 0.25, order: "mesh-first", show: true });
const group = scene.children[0];
assert.ok(group instanceof Group);
assert.deepEqual(group.children.map((child) => child.type), ["Mesh", "DirectionalLight"]);
const mesh = group.children[0];
assert.ok(mesh instanceof Mesh);
assert.equal(mesh.position.x, 4);
assert.equal(mesh.geometry.parameters.width, 1);
assert.equal(mesh.geometry.parameters.height, 2);
assert.equal(mesh.geometry.parameters.depth, 3);
assert.ok(mesh.material instanceof MeshStandardMaterial);
assert.equal(mesh.material.color.getHexString(), "ffa500");
assert.equal(mesh.material.roughness, 0.25);
const stableMesh = mesh;

assert.equal(typeof mesh, "object");
assert.equal(native.host.diagnostics.eventRegistrations, 1);
assert.equal(native.host.dispatchPointerEvent(mesh, "pointerdown"), true);
assert.equal(compiled.pointerEventCount, 1);

render({ x: 9, roughness: 0.7, order: "light-first", show: true });
assert.equal(group.children[1], stableMesh, "property writes and sibling moves preserve the existing mesh object");
assert.equal(stableMesh.position.x, 9, "compiled scalar binding updates the Three vector each render");
assert.equal(stableMesh.material.roughness, 0.7, "material path writes reach an attached material");
assert.deepEqual(group.children.map((child) => child.type), ["DirectionalLight", "Mesh"]);

render({ x: 6, roughness: 0.1, order: "light-first", show: true, reset: true });
assert.equal(stableMesh.position.x, 0, "removed scalar transform props restore the Three constructor default");
assert.equal(stableMesh.material.roughness, 1, "removed material props restore the material constructor default");
const oldMaterial = stableMesh.material;
let oldMaterialDisposed = 0;
oldMaterial.addEventListener("dispose", () => oldMaterialDisposed++);
render({ x: 6, roughness: 0.3, order: "light-first", show: true, materialKey: "material-v2" });
assert.notEqual(stableMesh.material, oldMaterial, "keyed material replacement attaches the replacement resource");
assert.equal(oldMaterialDisposed, 1, "replaced owned material is disposed once");

let geometryDisposed = 0;
let materialDisposed = 0;
stableMesh.geometry.addEventListener("dispose", () => geometryDisposed++);
stableMesh.material.addEventListener("dispose", () => materialDisposed++);
render({ x: 9, roughness: 0.7, order: "light-first", show: false, materialKey: "material-v2" });
assert.deepEqual(group.children.map((child) => child.type), ["DirectionalLight"]);
assert.equal(geometryDisposed, 1);
assert.equal(materialDisposed, 1);
assert.equal(native.host.diagnostics.eventRegistrations, 0);
assert.equal(native.host.diagnostics.liveResources, 0);

native.dispose();
assert.equal(scene.children.length, 0);

const cameraScene = new Group();
const cameraRoot = createThreeNativeRoot(cameraScene);
cameraRoot.root.render(jsx(compiled.CameraScene, { fov: 70 }));
const camera = cameraScene.children[0];
assert.ok(camera instanceof PerspectiveCamera);
const wideProjection = camera.projectionMatrix.elements.slice();
cameraRoot.root.render(jsx(compiled.CameraScene, { fov: undefined }));
assert.equal(camera.fov, 50, "removed camera props restore the constructor default");
assert.notDeepEqual(camera.projectionMatrix.elements, wideProjection, "camera projection updates after prop reset");
cameraRoot.dispose();

const sharedScene = new Group();
const sharedRoot = createThreeNativeRoot(sharedScene);
let sharedGeometryDisposed = 0;
let sharedMaterialDisposed = 0;
compiled.sharedGeometry.addEventListener("dispose", () => sharedGeometryDisposed++);
compiled.sharedMaterial.addEventListener("dispose", () => sharedMaterialDisposed++);
sharedRoot.root.render(jsx(compiled.SharedScene, {}));
assert.equal(sharedScene.children[0].geometry, compiled.sharedGeometry);
assert.equal(sharedScene.children[0].material, compiled.sharedMaterial);
sharedRoot.dispose();
assert.equal(sharedGeometryDisposed, 0, "primitive geometry remains borrowed after root disposal");
assert.equal(sharedMaterialDisposed, 0, "primitive material remains borrowed after root disposal");

const existingScene = new Group();
const host = createThreeHost({
  registry: {
    customObject: () => new Group(),
  },
  propertyWriters: {
    customPhase(handle, value) {
      assert.equal(handle.kind, "object");
      handle.object.userData.phase = value;
    },
  },
});
const customRoot = createNativeRoot(host, existingScene);
customRoot.render(jsx("customObject", { customPhase: 12 }));
assert.equal(existingScene.children[0].userData.phase, 12, "custom tag/property registries extend the host");
assert.throws(() => host.createText("not a Three child"), /does not support text/);
customRoot.dispose();
host.dispose();
assert.equal(existingScene.children.length, 0);

const argumentHost = createThreeHost();
const oldArgs = [1, 2, 3];
const geometry = argumentHost.createElement("boxGeometry", undefined, { args: oldArgs });
argumentHost.setProp(geometry, "args", [1, 2, 3], oldArgs);
assert.throws(
  () => argumentHost.setProp(geometry, "args", [2, 2, 3], oldArgs),
  /args.*immutable.*key/,
);
argumentHost.dispose(geometry);
argumentHost.dispose();

const rayScene = new Group();
const rayRoot = createThreeNativeRoot(rayScene);
let raycastEvents = 0;
const rayMesh = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
rayMesh.position.z = 0;
const rayHandle = rayRoot.host.createElement("primitive", undefined, { object: rayMesh });
rayRoot.host.setProp(rayHandle, "onPointerDown", () => raycastEvents++, undefined);
rayRoot.host.place(rayScene, rayHandle, null);
const raycaster = new Raycaster();
const rayCamera = new PerspectiveCamera(60, 1, 0.1, 100);
rayCamera.position.z = 5;
rayCamera.lookAt(0, 0, 0);
rayCamera.updateMatrixWorld();
raycaster.setFromCamera(new Vector2(0, 0), rayCamera);
const intersections = raycastThreePointer(
  rayRoot.host,
  raycaster,
  rayScene,
  "pointerdown",
);
assert.ok(intersections.length > 0);
assert.equal(raycastEvents, intersections.length, "raycasts dispatch on each hit object without bubbling");
assert.equal(rayRoot.host.diagnostics.eventRegistrations, 1);
rayRoot.dispose();
assert.equal(rayRoot.host.diagnostics.eventRegistrations, 0);
assert.equal(rayScene.children.length, 0);
rayMesh.geometry.dispose();
rayMesh.material.dispose();

const cleanupScene = new Group();
const cleanupFailure = new Error("geometry cleanup failed");
let throwingDisposals = 0;
const cleanupRoot = createThreeNativeRoot(cleanupScene, {
  registry: {
    throwingGeometry() {
      const resource = new BoxGeometry();
      resource.addEventListener("dispose", () => {
        throwingDisposals++;
        throw cleanupFailure;
      });
      return resource;
    },
  },
});
cleanupRoot.root.render(jsx(compiled.CleanupScene, {}));
assert.equal(cleanupRoot.host.diagnostics.liveResources, 4);
const containsFailure = (error) => error === cleanupFailure ||
  (error instanceof AggregateError && error.errors.some(containsFailure));
assert.throws(() => cleanupRoot.dispose(), containsFailure,
  "per-node resource cleanup failures must reach the root caller");
assert.equal(throwingDisposals, 1);
assert.equal(cleanupScene.children.length, 0);
assert.equal(cleanupRoot.host.diagnostics.liveResources, 0);
assert.equal(cleanupRoot.host.diagnostics.liveHandles, 0);
assert.equal(cleanupRoot.host.diagnostics.eventRegistrations, 0);
assert.equal(cleanupRoot.host.diagnostics.disposedResources, 4,
  "remaining resources are released despite another resource throwing");
cleanupRoot.dispose();
assert.equal(throwingDisposals, 1, "failed cleanup is not retried on repeated disposal");

console.log("Three VDOM host execution test passed");
