import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const build = path.join(root, ".cache/r3act-package-build");
const report = JSON.parse(await readFile(path.join(build, "report.json"), "utf8"));
const consumer = await mkdtemp(path.join(tmpdir(), "r3act-package-consumer-"));
const record = { status: "RUNNING", platform: `${process.platform}-${process.arch}`, checks: [] };
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: consumer, encoding: "utf8", timeout: 120_000 });
  assert.equal(result.status, 0, `${command} ${args.join(" ")}\n${result.error ?? ""}\n${result.stdout}\n${result.stderr}`);
};
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const packageFile = (name) => path.join(root, report.packages[`@r3act/${name}`].file);
const installed = (name) => path.join(consumer, "node_modules/@r3act", name);
const packageImport = (name, subpath = ".") =>
  import(pathToFileURL(path.join(installed(name),
    subpath === "." ? "dist/index.js" : `dist/${subpath}.js`)).href);

try {
  for (const [name, detail] of Object.entries(report.packages)) {
    assert.equal(detail.sha256, hash(await readFile(path.join(root, detail.file))), `${name} tarball hash`);
  }
  const dependencies = Object.fromEntries(
    ["core", "vite", "host-dom", "host-three", "react-bridge"].map((name) =>
      [`@r3act/${name}`, `file:${packageFile(name)}`]),
  );
  await writeFile(path.join(consumer, "package.json"), JSON.stringify({
    name: "r3act-independent-consumer", private: true, type: "module",
    dependencies: {
      ...dependencies,
      "@radix-ui/react-dialog": "1.3.1", vite: "8.3.1", react: "19.3.0", "react-dom": "19.3.0", three: "0.186.1",
      "@types/react": "19.3.0", "@types/react-dom": "19.3.0", "@types/three": "0.186.0", "@types/node": "^24.19.2",
      "@typescript/native-preview": "7.0.0-dev.20260707.2",
    },
  }, null, 2));
  await writeFile(path.join(consumer, "pnpm-workspace.yaml"),
    `packages:\n  - .\noverrides:\n  "@r3act/core": ${JSON.stringify(dependencies["@r3act/core"])}\n`);
  run("pnpm", ["install", "--ignore-scripts"]);
  record.checks.push("five fresh tarballs install outside the checkout without scripts");
  await writeFile(path.join(consumer, "optional-bridge-isolation.mjs"), `import assert from "node:assert/strict";
import { registerHooks } from "node:module";
let allowReact = false;
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@radix-ui/")) throw new Error("RADIX_BRIDGE_DEPENDENCY_BLOCKED");
  if (specifier === "@vitejs/plugin-react") throw new Error("REACT_VITE_DEPENDENCY_BLOCKED");
  const isReact = specifier === "react" || specifier === "react-dom" || specifier.startsWith("react/") || specifier.startsWith("react-dom/");
  if (!allowReact && isReact) throw new Error("REACT_DEPENDENCY_BLOCKED");
  return nextResolve(specifier, context);
} });
await import("@r3act/core");
const vite = await import("@r3act/vite");
assert.equal(typeof vite.nativeReactPlugins, "function");
allowReact = true;
await import("@r3act/react-bridge");
await assert.rejects(import("@r3act/react-bridge/radix-dialog"), /RADIX_BRIDGE_DEPENDENCY_BLOCKED/);
`);
  run(process.execPath, ["optional-bridge-isolation.mjs"]);
  record.checks.push("native core/Vite import without React or plugin-react and the default bridge imports without Radix");

  for (const name of ["core", "vite", "host-dom", "host-three", "react-bridge"]) {
    const manifest = JSON.parse(await readFile(path.join(installed(name), "package.json"), "utf8"));
    assert.equal(manifest.name, `@r3act/${name}`);
    assert.equal(manifest.version, "0.0.0-private-alpha");
    assert.equal(manifest.license, "MIT");
    await readFile(path.join(installed(name), "LICENSE"));
  }
  record.checks.push("installed manifests and MIT licenses match private-alpha package identities");
  const viteManifest = JSON.parse(await readFile(path.join(installed("vite"), "package.json"), "utf8"));
  assert.equal(viteManifest.os, undefined, "explicit compilerBinary remains installable on another OS");
  assert.equal(viteManifest.cpu, undefined, "explicit compilerBinary remains installable on another CPU");
  assert.deepEqual(viteManifest.bin, {
    [`r3act-compiler-${process.platform}-${process.arch}`]: `./${report.compilerBinary.path}`,
  }, "the bundled compiler has a platform-labelled executable entry");
  assert.equal(report.compilerBinary.target, `${process.platform}-${process.arch}`);
  const installedBinary = path.join(installed("vite"), report.compilerBinary.path);
  assert.ok(((await stat(installedBinary)).mode & 0o111) !== 0,
    "the installed Rust/OXC compiler must retain an executable mode");
  const artifactManifest = JSON.parse(await readFile(
    path.join(installed("vite"), "dist/compiler/bin/manifest.json"), "utf8"));
  assert.equal(artifactManifest.schemaVersion, 1);
  assert.equal(artifactManifest.protocolVersion, 1);
  assert.equal(artifactManifest.artifacts.length, 1);
  const artifact = artifactManifest.artifacts[0];
  assert.equal(artifact.target, report.compilerBinary.rustTarget);
  assert.equal(artifact.platform, process.platform);
  assert.equal(artifact.arch, process.arch);
  assert.equal(artifact.sha256, hash(await readFile(installedBinary)));
  assert.equal(artifact.sha256, report.compilerBinary.sha256);
  assert.equal(artifact.bytes, (await stat(installedBinary)).size);
  assert.equal(path.resolve(installed("vite"), "dist/compiler/bin", artifact.file), installedBinary);
  const infoResult = spawnSync(installedBinary, ["--compiler-info"], {
    encoding: "utf8", timeout: 5_000, maxBuffer: 64 * 1024,
  });
  assert.equal(infoResult.status, 0, `installed compiler info: ${infoResult.error ?? infoResult.stderr}`);
  const compilerInfo = JSON.parse(infoResult.stdout);
  assert.equal(compilerInfo.schemaVersion, 1);
  assert.equal(compilerInfo.protocolVersion, artifactManifest.protocolVersion);
  for (const field of ["target", "platform", "arch"]) {
    assert.equal(compilerInfo[field], artifact[field], `installed compiler ${field}`);
  }
  record.compilerArtifact = { ...artifact, info: compilerInfo };
  record.checks.push("installed target manifest, executable bytes/hash and native protocol info agree");

  for (const name of ["core", "vite"]) {
    const packageRoot = installed(name);
    const visit = async (directory) => {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory()) await visit(filename);
        else if (filename.endsWith(".js.map") || filename.endsWith(".d.ts.map")) {
          const map = JSON.parse(await readFile(filename, "utf8"));
          assert.ok(Array.isArray(map.sources) && map.sources.length > 0);
          assert.equal(map.sources.length, map.sourcesContent.length);
          for (let index = 0; index < map.sources.length; index++) {
            const source = path.resolve(path.dirname(filename), map.sources[index]);
            const relative = path.relative(packageRoot, source);
            assert.ok(relative.startsWith(`sources${path.sep}`), `${filename} resolves inside packaged sources`);
            const contents = await readFile(source, "utf8");
            assert.equal(contents, map.sourcesContent[index]);
            assert.equal(hash(contents), report.sourceHashes[path.relative(packageRoot, source).replace(/^sources\//, "").split(path.sep).join("/")]);
          }
        }
      }
    };
    await visit(path.join(packageRoot, "dist"));
  }
  record.checks.push("installed JS and declaration maps resolve to hash-checked packaged TypeScript");

  const core = await import(pathToFileURL(path.join(installed("core"), "dist/src/native_runtime_api.js")).href);
  const coreDom = await import(pathToFileURL(path.join(installed("core"), "dist/src/native_dom_api.js")).href);
  const coreThree = await import(pathToFileURL(path.join(installed("core"), "dist/src/three_host.js")).href);
  const coreReact = await import(pathToFileURL(path.join(installed("core"), "dist/src/react_native_adapter.js")).href);
  const dom = await packageImport("host-dom");
  const three = await packageImport("host-three");
  const bridge = await packageImport("react-bridge");
  const radixBridge = await packageImport("react-bridge", "radix-dialog");
  const coreRadix = await import(pathToFileURL(path.join(installed("core"), "dist/src/react_radix_dialog_adapter.js")).href);
  assert.equal(radixBridge.RadixDialog, coreRadix.RadixDialog);
  assert.equal(radixBridge.ReactRadixDialog, coreRadix.ReactRadixDialog);
  assert.equal(typeof radixBridge.RadixDialog, "function");
  assert.equal(typeof radixBridge.ReactRadixDialog, "function");
  const bridgeManifest = JSON.parse(await readFile(path.join(installed("react-bridge"), "package.json"), "utf8"));
  assert.equal(bridgeManifest.peerDependencies["@radix-ui/react-dialog"], "1.3.1");
  assert.equal(bridgeManifest.peerDependenciesMeta["@radix-ui/react-dialog"].optional, true);
  assert.equal(dom.createDOMRoot, coreDom.createDOMRoot);
  assert.equal(three.createThreeHost, coreThree.createThreeHost);
  assert.equal(bridge.createReactNativeRootAdapter, coreReact.createReactNativeRootAdapter);
  assert.equal(bridge.createNativeReactRootAdapter, coreReact.createNativeReactRootAdapter);
  assert.equal(typeof bridge.createNativeReactRootAdapter, "function");
  assert.equal(typeof (await packageImport("host-three", "jsx-runtime")).jsx, "function");
  const host = {
    createElement: (tag) => ({ tag, props: {}, children: [] }),
    createText: (text) => ({ text, children: [] }),
    setText(target, text) { target.text = text; },
    setProp(target, key, value) { target.props[key] = value; },
    place(parent, child, before) {
      const old = parent.children.indexOf(child);
      if (old >= 0) parent.children.splice(old, 1);
      const index = before ? parent.children.indexOf(before) : parent.children.length;
      parent.children.splice(index, 0, child);
    },
    remove(parent, child) { parent.children.splice(parent.children.indexOf(child), 1); },
  };
  const container = { children: [] };
  const identityRoot = core.createNativeRoot(host, container, { scheduleCommit() {} });
  assert.ok(identityRoot.world instanceof core.OwnerStateWorld,
    "host package routes must share the core World constructor");
  identityRoot.mount(core.jsx("div", {}));
  identityRoot.dispose();
  record.checks.push("DOM, Three and React package routes re-export one core runtime graph");

  const appSource = `import { useState, use, createStore, createNativeRoot, storeRecord, Suspense, AsyncResource } from "@r3act/core";
import type { VDOMHost } from "@r3act/host-dom";
export const label = createStore("ready");
export const scene = createStore(storeRecord({ position: storeRecord({ x: 1 }) }));
export function Projected(props: { store: typeof scene }) {
  const value = use(props.store);
  return <output key="projection" data-level={value.position.x}>{value.position.x}</output>;
}
export const mountProjected = (host: VDOMHost<any>, container: any) => {
  const root = createNativeRoot(host, container, { scheduleCommit() {} });
  root.render(<Projected store={scene} />);
  return root;
};
export function Counter() {
  const [count, setCount] = useState(0);
  const text = use(label);
  return <section><output>{text}:{count}</output><button onClick={() => setCount(value => value + 1)}>Increment</button></section>;
}
export const mount = (host: VDOMHost<any>, container: any) => {
  const root = createNativeRoot(host, container, { scheduleCommit() {} });
  root.render(<Counter />);
  return root;
};
export function ResourceA(props: { resource: AsyncResource<string> }) {
  const value = use(props.resource);
  return <output key="a-host">{value}</output>;
}
export function ResourceB(props: { resource: AsyncResource<string> }) {
  const value = use(props.resource);
  return <output key="b-host">{value}</output>;
}
export const mountResourcePair = (host: VDOMHost<any>, container: any,
  a: AsyncResource<string>, b: AsyncResource<string>) => {
  const root = createNativeRoot(host, container);
  root.render(<section><Suspense fallback={<output key="a-host">a-loading</output>}>
    <ResourceA resource={a} />
  </Suspense><Suspense fallback={<output key="b-host">b-loading</output>}>
    <ResourceB resource={b} />
  </Suspense></section>);
  return root;
};
`;
  await writeFile(path.join(consumer, "app.tsx"), appSource);
  await writeFile(path.join(consumer, "types.tsx"), `/** @jsxImportSource @r3act/host-three */
import { useState } from "@r3act/core";
export function Scene() { const [angle] = useState(0); return <group><mesh rotation={[0, angle, 0]}><icosahedronGeometry args={[1, 2]} /></mesh></group>; }
// @ts-expect-error invalid geometry argument type
export const invalid = <icosahedronGeometry args={[1, "bad"]} />;
`);
  await writeFile(path.join(consumer, "bridge-types.tsx"), `import { createElement, type ReactNode } from "react";
import { createNativeReactRootAdapter, createReactNativeRootAdapter } from "@r3act/react-bridge";
import { RadixDialog, ReactRadixDialog } from "@r3act/react-bridge/radix-dialog";
export const Island = createNativeReactRootAdapter((props: { value: number }) =>
  createElement("output", null, props.value));
export const validIsland = <Island value={1} />;
// @ts-expect-error React island retains its component prop contract.
export const invalidIsland = <Island value="bad" />;
export const Embedded = createReactNativeRootAdapter(Island);
export const validEmbedded = createElement(Embedded, { value: 1 });
// @ts-expect-error Opposite bridge direction retains the same prop contract.
export const invalidEmbedded = createElement(Embedded, { value: "bad" });
const dialogProps = { open: false, onOpenChange(_open: boolean) {}, title: "Title",
  description: "Description", triggerLabel: "Open" };
export const validDialog = <RadixDialog {...dialogProps} />;
function ReactChild() { return createElement("input", { defaultValue: "note" }); }
export const validDialogChild = <RadixDialog {...dialogProps} children={createElement(ReactChild)} />;
const ReactChildrenIsland = createNativeReactRootAdapter((props: { children?: ReactNode }) =>
  createElement("section", null, props.children));
export const validGenericReactChildren = <ReactChildrenIsland children={createElement(ReactChild)} />;
// @ts-expect-error The generic React boundary also rejects native VNode children.
export const invalidGenericReactChildren = <ReactChildrenIsland children={validIsland} />;
export const validReactDialog = createElement(ReactRadixDialog, dialogProps);
// @ts-expect-error The controlled open value is a boolean.
export const invalidDialog = <RadixDialog {...dialogProps} open="yes" />;
// @ts-expect-error Dialog requires its controlled change callback.
export const missingDialogCallback = <RadixDialog open={false} title="Title" description="Description" triggerLabel="Open" />;
// @ts-expect-error A native VNode is not a React child.
export const invalidDialogChild = <RadixDialog {...dialogProps} children={validIsland} />;
`);
  await writeFile(path.join(consumer, "tsconfig.json"), JSON.stringify({ compilerOptions: {
    target: "ES2023", module: "NodeNext", moduleResolution: "NodeNext", strict: true,
    noEmit: true, jsx: "react-jsx", jsxImportSource: "@r3act/core", types: ["node"],
  }, files: ["app.tsx", "types.tsx", "bridge-types.tsx"] }));
  run("pnpm", ["exec", "tsgo", "-p", "tsconfig.json"]);
  record.checks.push("installed core/Three JSX, both React bridge directions and controlled Radix dialog props typecheck authored TSX");

  const example = path.join(root, "examples/forked-transitions");
  const copiedExample = path.join(consumer, "forked-transitions");
  await mkdir(copiedExample);
  record.forkedExampleSources = [];
  for (const filename of ["app.tsx", "scene.tsx", "main.ts", "vite.config.ts", "tsconfig.json"]) {
    const bytes = await readFile(path.join(example, filename));
    const copied = path.join(copiedExample, filename);
    await writeFile(copied, bytes);
    assert.equal(hash(await readFile(copied)), hash(bytes));
    record.forkedExampleSources.push({ path: `examples/forked-transitions/${filename}`, sha256: hash(bytes) });
  }
  run("pnpm", ["exec", "tsgo", "-p", "forked-transitions/tsconfig.json"]);
  record.checks.push("actual forked-transition DOM/Three example and Vite config typecheck against fresh installed public packages");

  const customExample = path.join(root, "examples/custom-host");
  const copiedCustomExample = path.join(consumer, "custom-host");
  await mkdir(copiedCustomExample);
  record.customHostExampleSources = [];
  for (const filename of ["app.tsx", "scene.tsx", "main.ts", "retained_host.ts", "vite.config.ts", "tsconfig.json"]) {
    const bytes = await readFile(path.join(customExample, filename));
    const copied = path.join(copiedCustomExample, filename);
    await writeFile(copied, bytes);
    assert.equal(hash(await readFile(copied)), hash(bytes));
    record.customHostExampleSources.push({ path: `examples/custom-host/${filename}`, sha256: hash(bytes) });
  }
  run("pnpm", ["exec", "tsgo", "-p", "custom-host/tsconfig.json"]);
  record.checks.push("actual independent Canvas host and compiled DOM/Three/Canvas example typecheck against fresh public packages");

  const { nativeModulePlugin } = await import(pathToFileURL(path.join(installed("vite"), "dist/compiler/vite_native_plugin.js")).href);
  const { build: viteBuild } = await import(pathToFileURL(path.join(consumer, "node_modules/vite/dist/node/index.js")).href);
  const blocker = path.join(consumer, "blocked-tools");
  await mkdir(blocker);
  await writeFile(path.join(blocker, "cargo"), "#!/bin/sh\necho 'Cargo must not run for an installed consumer' >&2\nexit 97\n", { mode: 0o755 });
  const previousPath = process.env.PATH;
  process.env.PATH = `${blocker}${path.delimiter}${previousPath}`;
  try {
    await viteBuild({ configFile: false, root: consumer, logLevel: "error",
      plugins: [nativeModulePlugin()],
      build: { minify: false, lib: { entry: path.join(consumer, "app.tsx"), formats: ["es"], fileName: "app" },
        rolldownOptions: { external: (id) => id.startsWith("@r3act/") } },
    });
  } finally {
    process.env.PATH = previousPath;
  }
  const emitted = await readFile(path.join(consumer, "dist/app.js"), "utf8");
  assert.match(emitted, /__nativeUseStateAt/);
  const app = await import(pathToFileURL(path.join(consumer, "dist/app.js")).href);
  const runtimeContainer = { children: [] };
  const mounted = app.mount(host, runtimeContainer);
  const output = runtimeContainer.children[0].children[0];
  const button = runtimeContainer.children[0].children[1];
  const text = (node) => (node.text ?? "") + node.children.map(text).join("");
  assert.equal(text(output), "ready:0");
  button.props.onClick();
  mounted.flush();
  assert.equal(text(output), "ready:1");
  assert.equal(runtimeContainer.children[0].children[1], button);
  app.label.dispatch(() => "updated");
  mounted.flush();
  assert.equal(text(output), "updated:1");
  mounted.dispose();
  assert.equal(runtimeContainer.children.length, 0);
  record.checks.push("installed Rust/OXC plugin compiles and runs state/store TSX without Cargo");
  const projectedContainer = { children: [] };
  const projected = app.mountProjected(host, projectedContainer);
  const projectedOutput = projectedContainer.children[0];
  const queue = new core.NativeRootWorkQueue();
  try {
    assert.equal(text(projectedOutput), "1");
    app.scene.dispatch(core.storeRecord({ position: core.storeRecord({ x: 7 }) }));
    assert.equal(queue.enqueueStores({ id: "installed-projection", roots: [
      { root: projected, stores: [app.scene] },
    ] }).status, "committed");
    assert.equal(projectedContainer.children[0], projectedOutput);
    assert.equal(projectedOutput.props["data-level"], 7);
    assert.equal(text(projectedOutput), "7");
  } finally { queue.dispose(); projected.dispose(); }
  assert.equal(projectedContainer.children.length, 0);
  assert.equal(app.scene.diagnostics().roots, 0);
  record.checks.push("installed storeRecord provenance and compiled scoped projections share the core runtime");

  const pairContainer = { children: [] };
  let resolveA, resolveB;
  const pairA = new core.AsyncResource(new Promise((done) => { resolveA = done; }));
  const pairB = new core.AsyncResource(new Promise((done) => { resolveB = done; }));
  const pairRoot = app.mountResourcePair(host, pairContainer, pairA, pairB);
  const pairQueue = new core.NativeRootWorkQueue();
  try {
    const pairWork = pairQueue.enqueueResources({ id: "installed-resource-pair",
      roots: [{ root: pairRoot, resources: [pairA, pairB] }] });
    assert.equal(pairWork.status, "pending");
    assert.equal(text(pairContainer.children[0]), "a-loadingb-loading");
    resolveA("a-ready");
    for (let index = 0; index < 8; index++) await Promise.resolve();
    assert.equal(pairWork.status, "pending");
    assert.equal(text(pairContainer.children[0]), "a-loadingb-loading");
    resolveB("b-ready");
    for (let index = 0; index < 8; index++) await Promise.resolve();
    assert.equal(pairWork.status, "committed");
    assert.equal(text(pairContainer.children[0]), "a-readyb-ready");
  } finally { pairQueue.dispose(); pairRoot.dispose(); }
  assert.equal(pairContainer.children.length, 0);
  record.checks.push("installed compiled resource leaves reveal together through the public queue");

  record.status = "PASS";
} catch (error) {
  record.status = "FAIL";
  record.error = String(error?.stack ?? error);
  throw error;
} finally {
  await writeFile(path.join(build, "consumer-verification.json"), JSON.stringify(record, null, 2) + "\n");
  await rm(consumer, { recursive: true, force: true });
}
console.log(JSON.stringify(record, null, 2));
