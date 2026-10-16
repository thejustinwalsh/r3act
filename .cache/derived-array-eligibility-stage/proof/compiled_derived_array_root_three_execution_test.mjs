import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as THREE from "three";
import { nativeModulePlugin } from "../../../compiler/vite_native_plugin.ts";
import { createThreeNativeRoot } from "../runtime/src/three_host.ts";
import { jsx } from "../runtime/src/jsx_binding_runtime.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const stageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const compilerBinaryPath = path.resolve(process.argv[2] ?? "");
assert.ok(process.argv[2], "pass the staged derived-array compiler binary");
const attemptId = `${Date.now()}-${process.pid}-${randomUUID()}`;
const outputDir = path.join(stageRoot, "proof", "results");
const authoredPath = path.join(outputDir, `authored-${attemptId}.tsx`);
const emittedPath = path.join(outputDir, `emitted-${attemptId}.mjs`);
const resultPath = path.join(outputDir, `result-${attemptId}.json`);
const failurePath = path.join(outputDir, `failure-${attemptId}.json`);
const runtimePath = path.join(stageRoot, "runtime/src/native_runtime_api.ts");
const runtimeUrl = pathToFileURL(runtimePath).href;
const authored = `import { useState } from ${JSON.stringify(runtimeUrl)};
export const trace = { renders: 0, setValue: null };
function Row() {
  trace.renders++;
  const [x, setValue] = useState(1);
  trace.setValue = setValue;
  const parity = x % 2;
  return <mesh position={[x, parity, 0]} />;
}
export function App() { return <Row />; }`;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (filename) => sha256(await readFile(filename));
const plugin = nativeModulePlugin({
  root: projectRoot,
  compilerRoot: projectRoot,
  compilerBinary: compilerBinaryPath,
});
plugin.configResolved?.call({}, { root: projectRoot });
const context = {
  addWatchFile() {},
  async resolve(specifier) {
    return specifier === runtimeUrl ? { id: runtimePath } : null;
  },
  error(message) { throw new Error(String(message)); },
};

let mounted;
let originalSetProp;
let reenter;
try {
  await mkdir(outputDir, { recursive: true });
  await writeFile(authoredPath, authored, { flag: "wx" });
  const transformed = await plugin.transform.call(context, authored, authoredPath);
  assert.ok(transformed?.code, "ordinary authored TSX compiles with the staged compiler");
  assert.doesNotMatch(authored, /@native-ui|@jsx|\bjsx\s*[,}]/);
  assert.match(transformed.code, /schemaVersion:\s*2, ownerProgramId:/);
  assert.match(transformed.code, /position=\{__nativeBindStatePropAt\(/);
  assert.match(transformed.code, /\(x\) => \(\[x, \(x % 2\), 0\]\)/);
  assert.doesNotMatch(transformed.code, /__nativeOwnerCutKernels|ownerUpdateProgram:/);
  await writeFile(emittedPath, transformed.code, { flag: "wx" });
  const app = await import(`${pathToFileURL(emittedPath).href}?attempt=${attemptId}`);

  const scene = new THREE.Scene();
  mounted = createThreeNativeRoot(scene, {
    namespace: THREE,
    rootOptions: {
      rootId: `derived-array-${attemptId}`,
      scheduleCommit() {},
    },
  });
  mounted.root.mount(jsx(app.App, {}));
  const mesh = scene.children[0];
  assert.ok(mesh?.isMesh, "the dynamic Three namespace created a real Mesh");
  const position = mesh.position;
  const tupleValues = () => [position.x, position.y, position.z];
  assert.deepEqual(tupleValues(), [1, 1, 0]);
  assert.equal(app.trace.renders, 1);

  originalSetProp = mounted.host.setProp.bind(mounted.host);
  mounted.host.setProp = (handle, name, value, previous) => {
    originalSetProp(handle, name, value, previous);
    if (reenter && name === "position") {
      const callback = reenter;
      reenter = undefined;
      callback();
    }
  };
  reenter = () => {
    assert.equal(app.trace.setValue(3), true, "host write can publish a newer state version");
    assert.equal(mounted.root.flush(), false, "nested flush remains behind the publication barrier");
  };
  assert.equal(app.trace.setValue(2), true);
  assert.equal(mounted.root.flush(), true, "the captured tuple cut is accepted");
  assert.deepEqual(tupleValues(), [2, 0, 0], "Three vector receives the captured tuple");
  assert.equal(mesh.position, position, "Three vector identity is retained by its writer");
  assert.equal(mounted.root.diagnostics().pendingChangeCount, 1, "reentrant version remains pending");
  assert.equal(app.trace.renders, 1, "generic tuple projector cut does not rerender Row");

  assert.equal(mounted.root.flush(), true, "the newer source version is committed next");
  assert.deepEqual(tupleValues(), [3, 1, 0]);
  assert.equal(mesh.position, position);
  assert.equal(mounted.root.diagnostics().pendingChangeCount, 0);
  assert.equal(app.trace.renders, 1);
  mounted.dispose();
  mounted = undefined;
  assert.equal(scene.children.length, 0, "Three host disposal detaches the owned mesh");

  const proof = {
    status: "PASS",
    claim: "authored scalar alias in a fixed array prop retains generic V2 state binding and updates a real Three Vector3 without rerender",
    scope: "Node execution with actual Three namespace and copied runtime snapshot; no owner tuple kernel is emitted",
    attemptId,
    node: process.version,
    compilerBinaryPath,
    hashes: {
      authored: await hashFile(authoredPath),
      emitted: await hashFile(emittedPath),
      compilerBinary: await hashFile(compilerBinaryPath),
      componentRoot: await hashFile(path.join(stageRoot, "runtime/src/component_state_runtime.ts")),
      world: await hashFile(path.join(stageRoot, "runtime/src/owner_state_world.ts")),
      vdom: await hashFile(path.join(stageRoot, "runtime/src/vdom_snapshot_runtime.ts")),
      runtimeApi: await hashFile(path.join(stageRoot, "runtime/src/native_runtime_api.ts")),
      layout: await hashFile(path.join(stageRoot, "runtime/src/compiled_state_layout.ts")),
      binding: await hashFile(path.join(stageRoot, "runtime/src/jsx_binding_runtime.ts")),
    },
    outputs: { initial: [1, 1, 0], captured: [2, 0, 0], reentrant: [3, 1, 0] },
    renders: app.trace.renders,
    retainedPositionIdentity: true,
    pendingAfterCapturedCut: 1,
    disposed: mounted === undefined,
  };
  await writeFile(resultPath, `${JSON.stringify(proof, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify({ resultPath, proof }, null, 2));
} catch (error) {
  const failure = {
    status: "FAIL",
    attemptId,
    error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    authoredPath,
    emittedPath,
    compilerBinaryPath,
    compilerBinarySha256: await hashFile(compilerBinaryPath).catch(() => null),
  };
  await writeFile(failurePath, `${JSON.stringify(failure, null, 2)}\n`, { flag: "wx" });
  throw error;
} finally {
  reenter = undefined;
  mounted?.dispose();
  plugin.closeBundle?.call({});
}
