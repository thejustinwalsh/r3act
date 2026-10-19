import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageOutput = path.join(root, ".cache/owner-row-fusion-package-v1");
const tarballPath = path.join(packageOutput, "compiled-ui-runtime.tgz");
const packageReportPath = path.join(packageOutput, "package-report.json");
const builtDistPath = path.join(packageOutput, "staging/dist");
const expectedCheckpointStatusSha256 = "7b7ef2d7db881a270cc20d77989f3b698fc8bdd84a3183a7b5b285e7bad69d10";
const expectedCheckpointArchiveSha256 = "cbe4ce3f557314fa093ac51214a2ba5e9cf0a5f0ad67b5429ce3a95a5e59a382";
assert.equal(`${process.platform}-${process.arch}`, "darwin-arm64", "this package qualification is scoped to Darwin arm64");
const consumer = await mkdtemp(path.join(tmpdir(), "compiled-ui-consumer-"));
const record = { status: "RUNNING", platform: `${process.platform}-${process.arch}`, checks: [] };
const run = (args) => {
  const result = spawnSync("pnpm", args, { cwd: consumer, encoding: "utf8", timeout: 120_000 });
  assert.equal(result.status, 0, `${result.error ?? ""}\n${result.stdout}\n${result.stderr}`);
};
try {
  const packageReport = JSON.parse(await readFile(packageReportPath, "utf8"));
  const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
  const packedTarballSha256 = sha256(await readFile(tarballPath));
  assert.equal(packageReport.tarballSha256, packedTarballSha256, "package report identifies the tarball under test");
  assert.ok(packageReport.checkpoint?.statusSha256 && packageReport.checkpoint?.archiveSha256,
    "package report freezes checkpoint status and archive hashes");
  const checkpointStatusBytes = await readFile(path.join(root, packageReport.checkpoint.statusPath));
  const checkpointStatus = JSON.parse(checkpointStatusBytes.toString("utf8"));
  assert.equal(sha256(checkpointStatusBytes), packageReport.checkpoint.statusSha256, "frozen checkpoint status hash matches");
  assert.equal(packageReport.checkpoint.statusSha256, expectedCheckpointStatusSha256, "package report names fixed fusion status");
  const checkpointArchiveBytes = await readFile(path.join(root, packageReport.checkpoint.archivePath));
  assert.equal(sha256(checkpointArchiveBytes), packageReport.checkpoint.archiveSha256, "frozen checkpoint archive hash matches");
  assert.equal(packageReport.checkpoint.archiveSha256, expectedCheckpointArchiveSha256, "package report names fixed fusion archive");
  assert.equal(checkpointStatus.archiveSha256, packageReport.checkpoint.archiveSha256, "checkpoint status names the frozen archive hash");
  assert.ok(packageReport.sourceInputs?.sha256 && Object.keys(packageReport.sourceInputs.sha256).length > 0,
    "package report contains frozen source input hashes");
  const expectedSourceInputs = Object.fromEntries(Object.entries(checkpointStatus.sourceAndBuildSha256)
    .filter(([filename]) => filename.startsWith("src/") || filename.startsWith("compiler/") ||
      ["package.json", "pnpm-lock.yaml", "tsconfig.native-tooling.json"].includes(filename))
    .sort(([left], [right]) => left.localeCompare(right)));
  assert.deepEqual(packageReport.sourceInputs.sha256, expectedSourceInputs,
    "source inputs exactly equal selected src/compiler/config inventory entries");
  assert.deepEqual(packageReport.checkpoint.sourceAndBuildSha256, expectedSourceInputs,
    "checkpoint source inventory excludes build outputs and unrelated historical assets");
  assert.equal(packageReport.sourceInputs.preBuildMismatches.length, 0);
  assert.equal(packageReport.sourceInputs.postBuildMismatches.length, 0);
  for (const [tool, input] of Object.entries(packageReport.toolInputs ?? {})) {
    assert.equal(sha256(await readFile(path.join(root, input.path))), input.sha256, `${tool} tool input remains frozen`);
  }
  for (const [filename, expected] of Object.entries(packageReport.sourceInputs.sha256)) {
    assert.equal(checkpointStatus.sourceAndBuildSha256[filename], expected, `${filename} is frozen by checkpoint inventory`);
    assert.equal(sha256(await readFile(path.join(root, filename))), expected, `${filename} source input still matches checkpoint`);
  }
  assert.deepEqual(packageReport.sourceMapPolicy?.additionalAuthoredDeclarationSources, ["src/native_jsx_types.d.ts"]);
  await writeFile(path.join(consumer, "package.json"), JSON.stringify({
    name: "independent-native-consumer", private: true, type: "module",
    dependencies: {
      "@compiled-ui/runtime": `file:${tarballPath}`,
      vite: "8.3.1", react: "19.3.0", three: "0.186.1",
      "@types/react": "19.3.0", "@types/three": "0.186.0", "@types/node": "^24.19.2",
      "@typescript/native-preview": "7.0.0-dev.20260707.2",
    },
  }, null, 2));
  run(["install", "--ignore-scripts"]);
  record.checks.push("tarball installed in external directory, install scripts disabled");
  const packedJsxDeclaration = await readFile(path.join(consumer, "node_modules/@compiled-ui/runtime/sources/src/native_jsx_types.d.ts"));
  assert.equal(sha256(packedJsxDeclaration), expectedSourceInputs["src/native_jsx_types.d.ts"],
    "authored JSX declaration dependency is shipped for editor navigation");
  const source = `import { useState, use, createStore, asyncTask, createNativeRoot } from "@compiled-ui/runtime";
import type { VDOMHost } from "@compiled-ui/runtime/dom";
export const label = createStore("ready");
export const tasks = [asyncTask("first", async (context) => 7), asyncTask("second", async (context) => {
  const first = context.get("first");
  if (typeof first !== "number") throw new Error("Expected numeric provider output");
  return first + 1;
})] as const;
export function Counter() {
  const [count, setCount] = useState(0);
  const text = use(label);
  return <section><output>{text}:{count}</output><button onClick={() => setCount(previous => previous + 1)}>Increment</button></section>;
}
export const mount = (host: VDOMHost<any>, container: any) => {
  const root = createNativeRoot(host, container, {scheduleCommit() {}});
  root.render(<Counter />);
  return root;
};
`;
  await writeFile(path.join(consumer, "app.tsx"), source);
  await writeFile(path.join(consumer, "tsconfig.json"), JSON.stringify({ compilerOptions: {
    target: "ES2023", module: "NodeNext", moduleResolution: "NodeNext", strict: true,
    noEmit: true, jsx: "react-jsx", jsxImportSource: "@compiled-ui/runtime",
    types: ["node"],
  }, files: ["app.tsx"] }));
  run(["exec", "tsgo", "-p", "tsconfig.json"]);
  record.checks.push("authored package imports and automatic JSX namespace typecheck");
  await writeFile(path.join(consumer, "three-app.tsx"), `/** @jsxImportSource @compiled-ui/runtime/three */
import { useState } from "@compiled-ui/runtime";
export function SceneView() {
  const [rotation] = useState(0);
  return <group><pointLight args={["orange", 2]} /><mesh rotation={[0, rotation, 0]}><icosahedronGeometry args={[1,2]} /><meshPhysicalMaterial clearcoat={.5} /></mesh></group>;
}
// @ts-expect-error Constructor arguments must match Three's declarations.
export const wrong = <icosahedronGeometry args={[1,"two"]} />;
// @ts-expect-error Methods cannot be supplied as data props.
export const method = <group updateMatrix={true} />;
`);
  await writeFile(path.join(consumer, "tsconfig.three.json"), JSON.stringify({ compilerOptions: {
    target: "ES2023", module: "NodeNext", moduleResolution: "NodeNext", strict: true,
    noEmit: true, jsx: "react-jsx", types: ["node"],
  }, files: ["three-app.tsx"] }));
  run(["exec", "tsgo", "-p", "tsconfig.three.json"]);
  record.checks.push("installed Three JSX backend infers namespace constructors/props and rejects bad args/method props");
  const installed = path.join(consumer, "node_modules/@compiled-ui/runtime");
  const mapFiles = [];
  const collectMaps = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await collectMaps(filename);
      else if (entry.name.endsWith(".js.map") || entry.name.endsWith(".d.ts.map")) mapFiles.push(filename);
    }
  };
  await collectMaps(path.join(installed, "dist"));
  assert.equal(mapFiles.length, packageReport.sourceMapPolicy?.mapCount, "installed tarball contains every source map audited by the package build");
  assert.equal(packageReport.sourceMapPolicy?.packageSourceDirectory, "sources");
  assert.equal(packageReport.sourceMapPolicy?.inlineSources, true);
  const mapKinds = { javascript: 0, declarations: 0 };
  const mapAudit = [];
  const frozenSourceInputs = packageReport.sourceInputs.sha256;
  for (const mapFile of mapFiles) {
    const sourceMap = JSON.parse(await readFile(mapFile, "utf8"));
    assert.ok(Array.isArray(sourceMap.sources) && sourceMap.sources.length > 0, `${mapFile} has source entries`);
    assert.ok(Array.isArray(sourceMap.sourcesContent), `${mapFile} embeds its mapped source contents`);
    assert.equal(sourceMap.sourcesContent.length, sourceMap.sources.length, `${mapFile} embeds one content per source`);
    assert.equal(sourceMap.sourceRoot ?? "", "", `${mapFile} has no external sourceRoot`);
    if (mapFile.endsWith(".d.ts.map")) mapKinds.declarations++;
    else mapKinds.javascript++;
    for (let index = 0; index < sourceMap.sources.length; index++) {
      const source = sourceMap.sources[index];
      assert.equal(typeof source, "string");
      assert.ok(!path.isAbsolute(source) && !/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(source), `${mapFile} source is relative`);
      const resolved = path.resolve(path.dirname(mapFile), source);
      const relative = path.relative(installed, resolved);
      assert.ok(relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
        `${mapFile} source escapes installed package: ${source}`);
      assert.match(path.extname(resolved), /^\.tsx?$/, `${mapFile} source resolves to authored TypeScript`);
      const contents = await readFile(resolved, "utf8");
      assert.equal(sourceMap.sourcesContent[index], contents, `${mapFile} embedded source matches packaged authored source`);
      const relativeSource = path.relative(installed, resolved).split(path.sep).join("/");
      assert.ok(relativeSource.startsWith("sources/"), `${mapFile} source is under package sources/: ${relativeSource}`);
      const inputPath = relativeSource.slice("sources/".length);
      const expectedSourceHash = frozenSourceInputs[inputPath];
      assert.ok(expectedSourceHash, `${inputPath} appears in the frozen package source inputs`);
      const packagedSourceHash = sha256(Buffer.from(contents));
      assert.equal(packagedSourceHash, expectedSourceHash, `${inputPath} packaged source matches frozen checkpoint source hash`);
      assert.equal(packageReport.checkpoint.sourceAndBuildSha256[inputPath], expectedSourceHash,
        `${inputPath} hash is represented in the frozen checkpoint inventory`);
      mapAudit.push({ map: path.relative(installed, mapFile).split(path.sep).join("/"), source: relativeSource, sha256: packagedSourceHash });
    }
  }
  assert.ok(mapKinds.javascript > 0, "packed tarball contains JavaScript source maps");
  assert.ok(mapKinds.declarations > 0, "packed tarball contains declaration source maps");
  const installedManifest = JSON.parse(await readFile(path.join(installed, "package.json"), "utf8"));
  assert.ok(installedManifest.files.includes("sources"), "package whitelist includes mapped authored sources");
  const packagedSourceFiles = [];
  const collectPackagedSources = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await collectPackagedSources(filename);
      else packagedSourceFiles.push(path.relative(installed, filename).split(path.sep).join("/"));
    }
  };
  await collectPackagedSources(path.join(installed, "sources"));
  const expectedPackagedSources = new Set([
    ...packageReport.sourceMapPolicy.rewrittenEntries.map((entry) => entry.source),
    ...packageReport.sourceMapPolicy.additionalAuthoredDeclarationSources.map((filename) => `sources/${filename}`),
  ]);
  assert.deepEqual(packagedSourceFiles.sort(), [...expectedPackagedSources].sort(),
    "installed source tree exactly matches mapped sources plus declared JSX type dependency");
  for (const packedPath of packagedSourceFiles) {
    const sourcePath = packedPath.slice("sources/".length);
    const expectedHash = frozenSourceInputs[sourcePath];
    assert.ok(expectedHash, `${sourcePath} is a frozen authored source input`);
    assert.equal(sha256(await readFile(path.join(installed, packedPath))), expectedHash,
      `${sourcePath} installed bytes match the frozen checkpoint source hash`);
  }
  record.sourceMapAudit = { mapFiles: mapFiles.length, mapKinds, sourceEntries: mapAudit.length, entries: mapAudit };
  record.checks.push("installed tarball JS and declaration maps resolve every source inside packaged sources/ with matching authored text; no source escapes package");
  for (const filename of ["src/component_state_runtime.js", "src/pending_state_changes.js", "src/vdom_snapshot_runtime.js", "src/three_host.js", "src/three_property_writer.js", "src/three_jsx_runtime.js", "compiler/vite_native_module.js", "compiler/vite_native_plugin.js", "compiler/host_jsx_declarations.js"]) {
    const installedCode = await readFile(path.join(installed, "dist", filename), "utf8");
    const builtCode = await readFile(path.join(builtDistPath, filename), "utf8");
    assert.equal(installedCode, builtCode, `installed ${filename} differs from the newly packed build`);
  }
  record.checks.push("installed core and compiler code match the newly packed build exactly");
  const manifest = JSON.parse(await readFile(path.join(installed, "package.json"), "utf8"));
  assert.equal(manifest.os[0], process.platform);
  assert.equal(manifest.cpu[0], process.arch);
  const importEntry = async (name) => import(pathToFileURL(path.join(installed, manifest.exports[name].import)).href);
  const core = await importEntry(".");
  const automatic = await importEntry("./jsx-runtime");
  const dev = await importEntry("./jsx-dev-runtime");
  assert.equal(automatic.jsx("div", {children:"child",key:"old"}, "separate").props.key, "separate");
  assert.equal(dev.jsxDEV("div", null, "dev", false).props.key, "dev");
  assert.throws(() => core.useState(0), /compiled hook/);
  const react = await importEntry("./react");
  const three = await importEntry("./three");
  const threeJsx = await importEntry("./three/jsx-runtime");
  const threeDev = await importEntry("./three/jsx-dev-runtime");
  assert.equal(threeJsx.jsx("pointLight", { args: ["orange", 2] }, "light").props.key, "light");
  assert.equal(threeDev.jsxDEV("group", null, "group", false).props.key, "group");
  const dom = await importEntry("./dom");
  assert.equal(typeof react.createReactNativeRootAdapter, "function");
  assert.equal(typeof three.createThreeHost, "function");
  assert.equal(typeof three.createThreeNativeRoot, "function");
  assert.equal(typeof dom.createDOMRoot, "function");
  assert.equal(dom.MemoryVDOMHost, undefined, "research memory host must not be a public DOM export");
  record.checks.push("all public entries load; compilerless hooks fail; automatic keys honor ABI");
  const { nativeModulePlugin } = await importEntry("./vite");
  await writeFile(path.join(consumer, "custom-host.ts"), `import { Object3D } from "three";
export class ConsumerActor extends Object3D {
  tone: "warm" | "cool" = "warm";
  constructor(public speed: number) { super(); }
}`);
  await writeFile(path.join(consumer, "custom-host-app.tsx"), `/** @jsxImportSource @compiled-ui/runtime/three */
export const valid = <consumerActor args={[1]} tone="warm" />;
export const builtin = <group position={[1,2,3]} />;
// @ts-expect-error Generated types retain required constructor arguments.
export const missing = <consumerActor />;
// @ts-expect-error Generated types infer constructor argument types.
export const args = <consumerActor args={["fast"]} />;
// @ts-expect-error Generated types infer custom property values.
export const tone = <consumerActor args={[1]} tone="invalid" />;
`);
  const jsxHosts = [{ namespaceModule: "./custom-host.ts", intrinsicMapModule: "@compiled-ui/runtime/three", intrinsicMapExport: "ThreeIntrinsicElements", jsxImportSource: "@compiled-ui/runtime/three", declarationFile: "custom-host-jsx.d.ts" }];
  const { build } = await import(pathToFileURL(path.join(consumer, "node_modules/vite/dist/node/index.js")).href);
  const blocker = path.join(consumer, "blocked-tools");
  await mkdir(blocker);
  await writeFile(path.join(blocker, "cargo"), "#!/bin/sh\necho 'Cargo must not run in installed consumer' >&2\nexit 97\n", {mode:0o755});
  const oldPath = process.env.PATH;
  process.env.PATH = `${blocker}${path.delimiter}${oldPath}`;
  try {
    await build({ configFile:false, root:consumer, logLevel:"error", plugins:[nativeModulePlugin({ jsxHosts })],
      build:{lib:{entry:path.join(consumer,"app.tsx"),formats:["es"],fileName:"app"},
        rolldownOptions:{external:(id)=>id.startsWith("@compiled-ui/runtime")}} });
  } finally { process.env.PATH = oldPath; }
  for (const jsx of ["react-jsx", "react-jsxdev"]) {
    await writeFile(path.join(consumer, "tsconfig.generated-host.json"), JSON.stringify({ compilerOptions: {
      target: "ES2023", module: "NodeNext", moduleResolution: "NodeNext", strict: true,
      noEmit: true, jsx, types: ["node"],
    }, files: ["custom-host-jsx.d.ts", "custom-host-app.tsx"] }));
    run(["exec", "tsgo", "-p", "tsconfig.generated-host.json"]);
  }
  record.checks.push("installed Vite compiler generates checked custom-host JSX declarations for both automatic runtimes without Cargo");
  const app = await import(pathToFileURL(path.join(consumer, "dist/app.js")).href);
  const node = (tag, text) => ({ tag, text, props:{}, children:[] });
  const container = node("container");
  const host = {
    createElement: (tag) => node(tag), createText: (text) => node(undefined,text),
    setText: (target,text) => {target.text=text;},
    setProp: (target,key,value) => {if(value===undefined) delete target.props[key]; else target.props[key]=value;},
    place: (parent,child,before) => { const old=parent.children.indexOf(child); if(old>=0)parent.children.splice(old,1); const at=before?parent.children.indexOf(before):parent.children.length; parent.children.splice(at,0,child); },
    remove:(parent,child)=>{parent.children.splice(parent.children.indexOf(child),1);},
  };
  const native = app.mount(host, container);
  const output = container.children[0].children[0];
  const button = container.children[0].children[1];
  const text = (target) => (target.text ?? "") + target.children.map(text).join("");
  assert.equal(text(output), "ready:0");
  button.props.onClick(); native.flush();
  assert.equal(text(output), "ready:1");
  assert.equal(container.children[0].children[1], button);
  app.label.dispatch(() => "updated"); native.flush();
  assert.equal(text(output), "updated:1");
  assert.deepEqual(app.tasks.map(task => task.dependsOn), [[], ["first"]]);
  const execution = core.createTaskExecution(app.tasks, {});
  const completed = await execution.completion;
  assert.equal(completed.values.get("second"), 8);
  execution.dispose();
  native.dispose();
  assert.equal(container.children.length, 0);
  assert.deepEqual(app.label.diagnostics(), {roots:0,listeners:0,readers:0,retainedActions:0,transitions:0});
  record.checks.push("installed Vite plugin compiles real TSX/state/store/DAG with bundled Rust binary and no Cargo; updates/identity/teardown pass");

  await writeFile(path.join(consumer, "three-app.tsx"), `/** @jsxImportSource @compiled-ui/runtime/three */
import { useState } from "@compiled-ui/runtime";
export function SceneView({ trace }: { trace: { set?: (value: number) => boolean } }) {
  const [value, setValue] = useState(1);
  trace.set = setValue;
  return <mesh position={[value, 2, 3]}>
    <boxGeometry args={[1, 2, 3]} />
    <meshStandardMaterial roughness={value / 10} />
  </mesh>;
}
`);
  const { build: buildConsumer } = await import(pathToFileURL(path.join(consumer, "node_modules/vite/dist/node/index.js")).href);
  const originalPath = process.env.PATH;
  process.env.PATH = `${blocker}${path.delimiter}${originalPath}`;
  try {
    await buildConsumer({ configFile:false, root:consumer, logLevel:"error", plugins:[nativeModulePlugin()],
      build:{lib:{entry:path.join(consumer,"three-app.tsx"),formats:["es"],fileName:"three-app"},
        outDir:path.join(consumer,"dist-three"), emptyOutDir:true,
        rolldownOptions:{external:(id)=>id === "three" || id.startsWith("@compiled-ui/runtime")} } });
  } finally { process.env.PATH = originalPath; }
  const threeApp = await import(pathToFileURL(path.join(consumer, "dist-three/three-app.js")).href);
  const threeNamespace = await import(pathToFileURL(path.join(consumer, "node_modules/three/build/three.module.js")).href);
  const scene = new threeNamespace.Scene();
  const threeRoot = three.createThreeNativeRoot(scene, { namespace: threeNamespace });
  const trace = {};
  threeRoot.root.mount(core.jsx(threeApp.SceneView, { trace }));
  const mesh = scene.children.find((child) => child instanceof threeNamespace.Mesh);
  assert.ok(mesh, "installed package Three host mounts an authored TSX mesh into a real Three Scene");
  assert.ok(mesh.geometry instanceof threeNamespace.BoxGeometry);
  assert.ok(mesh.material instanceof threeNamespace.MeshStandardMaterial);
  const position = mesh.position;
  assert.deepEqual(position.toArray(), [1, 2, 3]);
  assert.equal(mesh.material.roughness, 0.1);
  assert.equal(trace.set(7), true);
  assert.equal(threeRoot.root.flush(), true);
  assert.deepEqual(position.toArray(), [7, 2, 3]);
  assert.equal(mesh.material.roughness, 0.7);
  assert.equal(mesh.position, position, "installed package preserves the Three Vector3 while updating it");
  const threeDiagnosticsBeforeDispose = threeRoot.host.diagnostics;
  assert.ok(threeDiagnosticsBeforeDispose.createdResources >= 2);
  threeRoot.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(threeRoot.host.diagnostics.liveResources, 0);
  assert.equal(threeRoot.host.diagnostics.liveHandles, 0);
  assert.equal(threeRoot.host.diagnostics.createdResources, threeRoot.host.diagnostics.disposedResources);
  record.checks.push("installed package Vite plugin compiles TSX through bundled Rust/OXC and public Three host updates a real Scene and releases resources");
  record.status = "PASS";
} finally {
  await mkdir(packageOutput, {recursive:true});
  await writeFile(path.join(packageOutput, "consumer-results.json"), JSON.stringify(record,null,2)+"\n");
  await rm(consumer, {recursive:true,force:true});
}
console.log(JSON.stringify(record,null,2));
