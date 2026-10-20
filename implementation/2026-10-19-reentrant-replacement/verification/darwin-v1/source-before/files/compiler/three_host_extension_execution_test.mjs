import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { BufferGeometry, Group, MeshBasicMaterial, Scene } from "three";
import { nativeModulePlugin } from "./vite_native_plugin.ts";
import { jsx } from "../src/native_runtime_api.ts";
import { createThreeNativeRoot } from "../src/three_host.ts";

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nativeRuntimePath = path.join(directory, "src/native_runtime_api.ts");
const nativeImport = pathToFileURL(nativeRuntimePath).href;
const fixtureId = path.join(directory, ".cache/three-host-extension-authored.tsx");
const authored = `
import { createNativeRoot } from ${JSON.stringify(nativeImport)};
import { BufferGeometry } from "three";

export class ProbeGeometry extends BufferGeometry {
  static instances = [];
  constructor(size) {
    super();
    this.probeSize = size;
    this.mode = "uninitialized";
    this.disposeCalls = 0;
    ProbeGeometry.instances.push(this);
  }
  dispose() {
    this.disposeCalls++;
    super.dispose();
  }
}

export const geometryRefs = {
  left: { current: null },
  right: { current: null },
};

export function SceneView({ order, size, mode, borrowedGeometry, borrowedMaterial }) {
  return <group name="extension-root">
    {order.map((id) => <group key={id} name={id}>
      <mesh args={[borrowedGeometry, borrowedMaterial]}>
        <probeGeometry key={size} args={[size]} probe-mode={mode} ref={geometryRefs[id]} />
      </mesh>
    </group>)}
  </group>;
}
`;

assert.ok(!authored.includes("@native-ui"), "authored TSX must not require a native marker");
assert.ok(!authored.includes("@jsx"), "authored TSX must not require JSX pragmas");
assert.ok(!/import\s*\{[^}]*\bjsx\b/.test(authored), "authored TSX must not import the JSX factory");

const plugin = nativeModulePlugin({ root: directory });
const context = {
  addWatchFile() {},
  async resolve(id) {
    if (id === nativeImport) return { id: nativeRuntimePath };
    return null;
  },
  error(message) {
    throw new Error(String(message));
  },
};
const emittedPath = path.join(directory, ".cache/three-host-extension-authored.mjs");
let nativeRoot;

try {
  const emitted = await plugin.transform.call(context, authored, fixtureId);
  assert.ok(emitted?.code, "authored Three TSX must pass through Rust/OXC native compilation");
  assert.notEqual(emitted.code, authored, "nativeModulePlugin must transform authored TSX");
  assert.match(emitted.code, /import\s+\*\s+as\s+__nativeJsx/, "composed compiler must inject its module-local JSX factory");
  await mkdir(path.dirname(emittedPath), { recursive: true });
  await writeFile(emittedPath, emitted.code);
  const app = await import(`${pathToFileURL(emittedPath).href}?run=${Date.now()}`);

  const borrowedGeometry = new BufferGeometry();
  const borrowedMaterial = new MeshBasicMaterial();
  let borrowedGeometryDisposals = 0;
  let borrowedMaterialDisposals = 0;
  const disposeBorrowedGeometry = borrowedGeometry.dispose.bind(borrowedGeometry);
  const disposeBorrowedMaterial = borrowedMaterial.dispose.bind(borrowedMaterial);
  borrowedGeometry.dispose = () => {
    borrowedGeometryDisposals++;
    disposeBorrowedGeometry();
  };
  borrowedMaterial.dispose = () => {
    borrowedMaterialDisposals++;
    disposeBorrowedMaterial();
  };

  const scene = new Scene();
  nativeRoot = createThreeNativeRoot(scene, {
    registry: {
      probeGeometry: (args) => new app.ProbeGeometry(args[0]),
    },
    propertyWriters: {
      "probe-mode": (handle, value) => {
        if (handle.kind !== "resource" || !(handle.resource instanceof app.ProbeGeometry)) {
          throw new TypeError("probe-mode expects a ProbeGeometry resource");
        }
        handle.resource.mode = value;
      },
    },
    rootOptions: { rootId: "three-host-extension-proof", scheduleCommit() {} },
  });

  const render = (order, size, mode) => nativeRoot.root.update(jsx(app.SceneView, {
    order,
    size,
    mode,
    borrowedGeometry,
    borrowedMaterial,
  }));
  const extensionRoot = () => scene.children.find((child) => child.name === "extension-root");
  const sibling = (name) => extensionRoot()?.children.find((child) => child.name === name);
  const mesh = (name) => sibling(name)?.children[0];
  const currentGeometry = (name) => mesh(name)?.geometry;

  nativeRoot.root.mount(jsx(app.SceneView, {
    order: ["left", "right"],
    size: 2,
    mode: "initial",
    borrowedGeometry,
    borrowedMaterial,
  }));

  assert.deepEqual(extensionRoot().children.map((child) => child.name), ["left", "right"]);
  const initialLeftGroup = sibling("left");
  const initialRightGroup = sibling("right");
  const initialLeftGeometry = currentGeometry("left");
  const initialRightGeometry = currentGeometry("right");
  assert.ok(initialLeftGeometry instanceof app.ProbeGeometry);
  assert.ok(initialRightGeometry instanceof app.ProbeGeometry);
  assert.equal(initialLeftGeometry.probeSize, 2);
  assert.equal(initialRightGeometry.probeSize, 2);
  assert.equal(initialLeftGeometry.mode, "initial");
  assert.equal(initialRightGeometry.mode, "initial");
  assert.equal(mesh("left").material, borrowedMaterial);
  assert.equal(mesh("right").material, borrowedMaterial);
  assert.equal(app.geometryRefs.left.current, initialLeftGeometry, "mounted ref must expose the raw left Three resource");
  assert.equal(app.geometryRefs.right.current, initialRightGeometry, "mounted ref must expose the raw right Three resource");

  render(["right", "left"], 2, "updated");
  assert.deepEqual(extensionRoot().children.map((child) => child.name), ["right", "left"]);
  assert.equal(sibling("left"), initialLeftGroup, "keyed sibling reorder replaced the left Object3D");
  assert.equal(sibling("right"), initialRightGroup, "keyed sibling reorder replaced the right Object3D");
  assert.equal(currentGeometry("left"), initialLeftGeometry, "stable constructor key replaced the left resource");
  assert.equal(currentGeometry("right"), initialRightGeometry, "stable constructor key replaced the right resource");
  assert.equal(initialLeftGeometry.mode, "updated", "registered custom property writer did not update");
  assert.equal(initialRightGeometry.mode, "updated", "registered custom property writer did not update both keyed instances");

  render(["right", "left"], 3, "replacement");
  const replacementLeftGeometry = currentGeometry("left");
  const replacementRightGeometry = currentGeometry("right");
  assert.notEqual(replacementLeftGeometry, initialLeftGeometry, "constructor args change must replace the keyed geometry");
  assert.notEqual(replacementRightGeometry, initialRightGeometry, "constructor args change must replace each keyed geometry");
  assert.ok(replacementLeftGeometry instanceof app.ProbeGeometry, "replacement left attachment must reference its new owned geometry");
  assert.ok(replacementRightGeometry instanceof app.ProbeGeometry, "replacement right attachment must reference its new owned geometry");
  assert.equal(replacementLeftGeometry.probeSize, 3);
  assert.equal(replacementRightGeometry.probeSize, 3);
  assert.equal(initialLeftGeometry.disposeCalls, 1, "replaced owned geometry must dispose exactly once");
  assert.equal(initialRightGeometry.disposeCalls, 1, "replaced owned geometry must dispose exactly once");
  assert.equal(app.geometryRefs.left.current, replacementLeftGeometry, "left ref must follow constructor replacement");
  assert.equal(app.geometryRefs.right.current, replacementRightGeometry, "right ref must follow constructor replacement");
  assert.equal(mesh("left").geometry, replacementLeftGeometry);
  assert.equal(mesh("right").geometry, replacementRightGeometry);
  const retainedLeftMesh = mesh("left");
  const retainedRightMesh = mesh("right");

  nativeRoot.dispose();
  nativeRoot = undefined;
  assert.equal(scene.children.some((child) => child.name === "extension-root"), false, "root teardown left its Three subtree attached");
  assert.equal(retainedLeftMesh.geometry, borrowedGeometry, "teardown must restore the left mesh's borrowed geometry");
  assert.equal(retainedRightMesh.geometry, borrowedGeometry, "teardown must restore the right mesh's borrowed geometry");
  assert.equal(retainedLeftMesh.material, borrowedMaterial, "teardown must preserve the left mesh's borrowed material");
  assert.equal(retainedRightMesh.material, borrowedMaterial, "teardown must preserve the right mesh's borrowed material");
  assert.equal(app.geometryRefs.left.current, null, "root teardown must clear the left public object ref");
  assert.equal(app.geometryRefs.right.current, null, "root teardown must clear the right public object ref");
  assert.equal(replacementLeftGeometry.disposeCalls, 1, "root teardown must dispose the owned left geometry exactly once");
  assert.equal(replacementRightGeometry.disposeCalls, 1, "root teardown must dispose the owned right geometry exactly once");
  assert.equal(borrowedGeometryDisposals, 0, "the host disposed a borrowed geometry");
  assert.equal(borrowedMaterialDisposals, 0, "the host disposed a borrowed material");
  console.log(
    "Compiled Three host extension PASS: authored TSX without marker/pragma/factory import; public factory/property registration; custom prop update; keyed args replacement; keyed sibling reorder; raw resource ref; borrowed resource preservation; exact-once owned disposal; root teardown.",
  );
} finally {
  nativeRoot?.dispose();
  plugin.closeBundle?.call(context);
  await rm(emittedPath, { force: true });
}
