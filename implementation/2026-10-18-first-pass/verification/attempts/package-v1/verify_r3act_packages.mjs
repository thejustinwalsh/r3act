import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
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
      vite: "8.3.1", react: "19.3.0", three: "0.186.1",
      "@types/react": "19.3.0", "@types/three": "0.186.0", "@types/node": "^24.19.2",
      "@typescript/native-preview": "7.0.0-dev.20260707.2",
    },
    pnpm: { overrides: { "@r3act/core": dependencies["@r3act/core"] } },
  }, null, 2));
  run("pnpm", ["install", "--ignore-scripts"]);
  record.checks.push("five fresh tarballs install outside the checkout without scripts");

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
  assert.equal(viteManifest.bin, undefined, "a platform-specific binary is not exposed as a portable CLI");
  assert.equal(report.compilerBinary.target, `${process.platform}-${process.arch}`);
  await readFile(path.join(installed("vite"), report.compilerBinary.path));

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
  assert.equal(dom.createDOMRoot, coreDom.createDOMRoot);
  assert.equal(three.createThreeHost, coreThree.createThreeHost);
  assert.equal(bridge.createReactNativeRootAdapter, coreReact.createReactNativeRootAdapter);
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

  const appSource = `import { useState, use, createStore, createNativeRoot } from "@r3act/core";
import type { VDOMHost } from "@r3act/host-dom";
export const label = createStore("ready");
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
`;
  await writeFile(path.join(consumer, "app.tsx"), appSource);
  await writeFile(path.join(consumer, "types.tsx"), `/** @jsxImportSource @r3act/host-three */
import { useState } from "@r3act/core";
export function Scene() { const [angle] = useState(0); return <group><mesh rotation={[0, angle, 0]}><icosahedronGeometry args={[1, 2]} /></mesh></group>; }
// @ts-expect-error invalid geometry argument type
export const invalid = <icosahedronGeometry args={[1, "bad"]} />;
`);
  await writeFile(path.join(consumer, "tsconfig.json"), JSON.stringify({ compilerOptions: {
    target: "ES2023", module: "NodeNext", moduleResolution: "NodeNext", strict: true,
    noEmit: true, jsx: "react-jsx", jsxImportSource: "@r3act/core", types: ["node"],
  }, files: ["app.tsx", "types.tsx"] }));
  run("pnpm", ["exec", "tsgo", "-p", "tsconfig.json"]);
  record.checks.push("installed core and Three JSX declarations typecheck authored TSX");

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
