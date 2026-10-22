import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageBuild = path.join(root, ".cache/native-package-build");
const tarballPath = path.join(root, ".cache/compiled-ui-runtime.tgz");
const consumer = await mkdtemp(path.join(tmpdir(), "compiled-ui-consumer-"));
const record = { status: "RUNNING", platform: `${process.platform}-${process.arch}`, checks: [] };
const run = (args) => {
  const result = spawnSync("pnpm", args, { cwd: consumer, encoding: "utf8", timeout: 120_000 });
  assert.equal(result.status, 0, `${result.error ?? ""}\n${result.stdout}\n${result.stderr}`);
};
try {
  const packageReport = JSON.parse(await readFile(path.join(packageBuild, "package-report.json"), "utf8"));
  const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
  assert.equal(packageReport.tarballSha256, sha256(await readFile(tarballPath)), "package report identifies tested tarball");
  await writeFile(path.join(consumer, "package.json"), JSON.stringify({
    name: "independent-native-consumer", private: true, type: "module",
    dependencies: {
      "@compiled-ui/runtime": `file:${tarballPath}`,
      vite: "8.3.1", react: "19.3.0", "react-dom": "19.3.0", three: "0.186.1",
      "@types/react": "19.3.0", "@types/react-dom": "19.3.0", "@types/three": "0.186.0", "@types/node": "^24.19.2",
      "@typescript/native-preview": "7.0.0-dev.20260707.2",
    },
  }, null, 2));
  run(["install", "--ignore-scripts"]);
  record.checks.push("tarball installed in external directory, install scripts disabled");
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
  assert.equal(mapFiles.length, packageReport.sourceMapPolicy.mapCount, "installed tarball contains every audited map");
  assert.equal(packageReport.sourceMapPolicy.packageSourceDirectory, "sources");
  assert.equal(packageReport.sourceMapPolicy.inlineSources, true);
  const expectedPackagedSources = new Map(packageReport.sourceMapPolicy.packagedSources.map((entry) => [entry.file, entry.sha256]));
  const observedMapSources = new Map();
  const mapKinds = { javascript: 0, declarations: 0 };
  for (const mapFile of mapFiles) {
    const map = JSON.parse(await readFile(mapFile, "utf8"));
    assert.ok(Array.isArray(map.sources) && map.sources.length > 0, `${mapFile} has sources`);
    assert.ok(Array.isArray(map.sourcesContent), `${mapFile} includes source text`);
    assert.equal(map.sourcesContent.length, map.sources.length, `${mapFile} has one source text per source`);
    assert.equal(map.sourceRoot ?? "", "", `${mapFile} has no external sourceRoot`);
    if (mapFile.endsWith(".d.ts.map")) mapKinds.declarations++;
    else mapKinds.javascript++;
    for (let index = 0; index < map.sources.length; index++) {
      const source = map.sources[index];
      assert.equal(typeof source, "string");
      assert.ok(!path.isAbsolute(source) && !/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(source), `${mapFile} uses a relative source`);
      const sourceFile = path.resolve(path.dirname(mapFile), source);
      const inside = path.relative(installed, sourceFile);
      assert.ok(inside !== ".." && !inside.startsWith(`..${path.sep}`) && !path.isAbsolute(inside), `${mapFile} source escapes package`);
      assert.match(path.extname(sourceFile), /^\.tsx?$/, `${mapFile} resolves to TypeScript source`);
      const contents = await readFile(sourceFile, "utf8");
      assert.equal(map.sourcesContent[index], contents, `${mapFile} embedded text matches installed source`);
      const packageRelativeSource = path.relative(installed, sourceFile).split(path.sep).join("/");
      assert.ok(packageRelativeSource.startsWith("sources/"), `${mapFile} source is under sources/`);
      const expectedHash = expectedPackagedSources.get(packageRelativeSource);
      assert.ok(expectedHash, `${packageRelativeSource} appears in build source inventory`);
      assert.equal(sha256(Buffer.from(contents)), expectedHash, `${packageRelativeSource} hash matches build report`);
      observedMapSources.set(packageRelativeSource, expectedHash);
    }
  }
  assert.ok(mapKinds.javascript > 0 && mapKinds.declarations > 0, "both JS and declaration maps are present");
  const packedSourceFiles = [];
  const collectSources = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await collectSources(filename);
      else packedSourceFiles.push(path.relative(installed, filename).split(path.sep).join("/"));
    }
  };
  await collectSources(path.join(installed, "sources"));
  assert.deepEqual(packedSourceFiles.sort(), [...expectedPackagedSources.keys()].sort(), "installed source tree matches package report exactly");
  for (const [filename, expectedHash] of expectedPackagedSources) {
    assert.equal(sha256(await readFile(path.join(installed, filename))), expectedHash, `${filename} matches package report hash`);
  }
  assert.ok(expectedPackagedSources.has("sources/src/native_jsx_types.d.ts"), "authored JSX declaration is included for navigation");
  record.sourceMapAudit = { mapCount: mapFiles.length, mapKinds, mappedSourceCount: observedMapSources.size, packagedSourceCount: packedSourceFiles.length };
  record.checks.push("installed tarball JS/declaration maps resolve to hash-checked authored sources inside package");
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
  for (const filename of ["src/component_state_runtime.js", "src/pending_state_changes.js", "src/vdom_snapshot_runtime.js", "src/three_host.js", "src/three_property_writer.js", "src/three_jsx_runtime.js", "compiler/vite_native_module.js", "compiler/vite_native_plugin.js", "compiler/host_jsx_declarations.js"]) {
    const installedCode = await readFile(path.join(installed, "dist", filename), "utf8");
    const builtCode = await readFile(path.join(packageBuild, "dist", filename), "utf8");
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
  assert.equal(typeof react.createNativeReactRootAdapter, "function");
  assert.equal(typeof three.createThreeHost, "function");
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
  record.status = "PASS";
} finally {
  await mkdir(path.join(root, ".cache/native-package-verification"), {recursive:true});
  await writeFile(path.join(root, ".cache/native-package-verification/results.json"), JSON.stringify(record,null,2)+"\n");
  await rm(consumer, {recursive:true,force:true});
}
console.log(JSON.stringify(record,null,2));
