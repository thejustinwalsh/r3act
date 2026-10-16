import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const evidence = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(evidence, "../..");
const tarball = path.join(evidence, "compiled-ui-runtime.tgz");
const consumer = await mkdtemp(path.join(os.tmpdir(), "derived-array-kernel-consumer-"));
const attemptId = randomUUID();
const resultPath = path.join(evidence, "installed-three-array-row-result-v2.json");
const failurePath = path.join(evidence, `installed-three-array-kernel-failure-${attemptId}.json`);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const result = { status: "RUNNING", attemptId, checks: [] };
let plugin;
let rootBundle;
let previousPath;
let vdomModule;
let originalExecuteRows;
try {
  await writeFile(path.join(consumer, "package.json"), JSON.stringify({
    name: "derived-array-kernel-consumer",
    private: true,
    type: "module",
    dependencies: {
      "@compiled-ui/runtime": `file:${tarball}`,
      vite: "8.3.1",
      react: "19.3.0",
      three: "0.186.1",
    },
  }, null, 2));
  const install = spawnSync("pnpm", ["install", "--ignore-scripts"], {
    cwd: consumer,
    encoding: "utf8",
    timeout: 120_000,
  });
  await writeFile(path.join(evidence, "three-array-consumer-install-v2.log"),
    `${install.stdout ?? ""}\n${install.stderr ?? ""}`);
  assert.equal(install.status, 0, `${install.error ?? ""}\n${install.stdout}\n${install.stderr}`);

  const installed = path.join(consumer, "node_modules/@compiled-ui/runtime");
  const manifest = JSON.parse(await readFile(path.join(installed, "package.json"), "utf8"));
  const compiler = path.resolve(installed, manifest.bin["compiled-ui-compiler"]);
  const report = JSON.parse(await readFile(path.join(evidence, "package-report.json"), "utf8"));
  result.tarballSha256 = hash(await readFile(tarball));
  result.compilerSha256 = hash(await readFile(compiler));
  assert.equal(result.tarballSha256, report.tarballSha256);
  const builtCompiler = path.join(root, ".cache/native-package-build/dist/compiler/bin",
    `${process.platform}-${process.arch}`, "ui-graph-compiler-spike");
  assert.equal(result.compilerSha256, hash(await readFile(builtCompiler)));

  const runtimePath = path.join(installed, "dist/src/native_runtime_api.js");
  const runtimeUrl = pathToFileURL(runtimePath).href;
  const runtime = await import(runtimeUrl);
  vdomModule = await import(pathToFileURL(path.join(installed, "dist/src/vdom_snapshot_runtime.js")).href);
  const threeHost = await import(pathToFileURL(path.join(installed, "dist/src/three_host.js")).href);
  const { nativeModulePlugin } = await import(pathToFileURL(path.join(installed, "dist/compiler/vite_native_plugin.js")).href);
  const THREE = await import(pathToFileURL(path.join(consumer, "node_modules/three/build/three.module.js")).href);

  const blockedTools = path.join(consumer, "blocked-tools");
  await mkdir(blockedTools);
  await writeFile(path.join(blockedTools, "cargo"),
    "#!/bin/sh\necho 'Cargo must not run in installed consumer proof' >&2\nexit 97\n", { mode: 0o755 });
  previousPath = process.env.PATH;
  process.env.PATH = `${blockedTools}${path.delimiter}${previousPath}`;

  plugin = nativeModulePlugin();
  plugin.configResolved?.call({}, { root: consumer });
  const authoredPath = path.join(consumer, "scene.tsx");
  const authored = `import { useState } from ${JSON.stringify(runtimeUrl)};
export const trace = { renders: 0, setValue: undefined };
export function Scene() {
  trace.renders++;
  const [value, setValue] = useState(0);
  trace.setValue = setValue;
  const parity = value % 2;
  return <mesh position={[value, value + parity, value * 2]} rotation={[parity, 0, 0]}>
    <boxGeometry args={[1, 2, 3]} />
    <meshStandardMaterial roughness={value / 10} />
  </mesh>;
}`;
  const context = {
    addWatchFile() {},
    async resolve(specifier) { return specifier === runtimeUrl ? { id: runtimePath } : null; },
    error(message) { throw new Error(String(message)); },
  };
  const transformed = await plugin.transform.call(context, authored, authoredPath);
  assert.ok(transformed?.code, "installed compiler transformed authored Three TSX");
  assert.match(transformed.code, /stateLayout:\s*\{\s*schemaVersion:\s*1,\s*programId:/,
    "derived array component has an owner state layout");
  assert.match(transformed.code, /position: __nativeBindStatePropAt\(/,
    "array position uses the installed numeric array binding");
  const rowCuts = [];
  originalExecuteRows = vdomModule.VDOMSnapshotRoot.prototype.executePreparedNumericRows;
  assert.equal(typeof originalExecuteRows, "function");
  vdomModule.VDOMSnapshotRoot.prototype.executePreparedNumericRows = function (...args) {
    const outcome = originalExecuteRows.apply(this, args);
    rowCuts.push({ count: args[4], accepted: outcome !== null, outcome });
    return outcome;
  };
  const emittedPath = path.join(consumer, `scene-${attemptId}.mjs`);
  await writeFile(emittedPath, transformed.code);
  const app = await import(`${pathToFileURL(emittedPath).href}?attempt=${attemptId}`);
  const scene = new THREE.Scene();
  rootBundle = threeHost.createThreeNativeRoot(scene, {
    namespace: THREE,
    rootOptions: { rootId: `installed-derived-array-${attemptId}`, scheduleCommit() {} },
  });
  rootBundle.root.mount(runtime.jsx(app.Scene, {}));
  const mesh = scene.children.find((child) => child instanceof THREE.Mesh);
  assert.ok(mesh, "installed Three host mounted an actual Mesh");
  const position = mesh.position;
  const rotation = mesh.rotation;
  assert.deepEqual(position.toArray(), [0, 0, 0]);
  assert.deepEqual([rotation.x, rotation.y, rotation.z], [0, 0, 0]);
  assert.equal(mesh.material.roughness, 0);
  assert.equal(app.trace.renders, 1);
  result.checks.push("installed consumer mounted authored derived-array TSX into an actual Three scene");

  app.trace.setValue(3);
  rootBundle.root.flush();
  assert.equal(rowCuts.length, 1, "installed Root invoked the prepared owner-row executor once");
  assert.equal(rowCuts[0].count, 1);
  assert.equal(rowCuts[0].accepted, true, "prepared row executor accepted the derived array cut");
  assert.deepEqual(position.toArray(), [3, 4, 6]);
  assert.deepEqual([rotation.x, rotation.y, rotation.z], [1, 0, 0]);
  assert.equal(mesh.material.roughness, 0.3);
  assert.equal(mesh.position, position, "the existing Three vector object was updated in place");
  assert.equal(app.trace.renders, 1, "the prepared row update did not rerender the component");
  result.rowCut = rowCuts[0];
  result.checks.push("derived Three position array, rotation, and scalar material updated in place without rerender");

  app.trace.setValue(3);
  rootBundle.root.flush();
  assert.equal(rowCuts.length, 1, "equal state update did not invoke the prepared row executor again");
  rootBundle.dispose();
  rootBundle = undefined;
  assert.equal(scene.children.length, 0, "dispose detached the Three object");
  result.checks.push("equal state update was inert and installed Three root disposed cleanly");
  result.status = "PASS";
  result.path = "prepared owner-row executor; compiler emitted numeric array bindings and a state layout, with no compiled owner-kernel claim";
  result.componentRenderCount = app.trace.renders;
  result.positionAfterUpdate = position.toArray();
  result.rotationAfterUpdate = [rotation.x, rotation.y, rotation.z];
  result.roughnessAfterUpdate = mesh.material.roughness;
  result.compilerSource = "fresh package build; Cargo blocked in installed consumer";
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  result.status = "FAIL";
  result.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  await writeFile(failurePath, `${JSON.stringify(result, null, 2)}\n`);
  throw error;
} finally {
  rootBundle?.dispose();
  if (originalExecuteRows && vdomModule) {
    vdomModule.VDOMSnapshotRoot.prototype.executePreparedNumericRows = originalExecuteRows;
  }
  plugin?.closeBundle?.call({});
  if (previousPath !== undefined) process.env.PATH = previousPath;
  await rm(consumer, { recursive: true, force: true });
}

console.log(JSON.stringify(result, null, 2));
