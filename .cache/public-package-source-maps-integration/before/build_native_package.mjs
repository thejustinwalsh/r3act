import { spawnSync } from "node:child_process";
import { mkdir, rm, writeFile, copyFile, chmod, readFile, stat, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staging = path.join(root, ".cache/native-package-build");
const run = (command, args, env = process.env, cwd = root) => {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status})`);
};
await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
run("pnpm", ["exec", "tsgo", "-p", "tsconfig.native-package.json"]);
run("cargo", ["build", "--locked", "--release", "--manifest-path", "compiler/oxc-spike/Cargo.toml", "--bin", "ui-graph-compiler-spike"],
  { ...process.env, CARGO_HOME: process.env.CARGO_HOME ?? path.join(root, ".cache/cargo") });
const suffix = process.platform === "win32" ? ".exe" : "";
const binaryName = `ui-graph-compiler-spike${suffix}`;
const binaryDirectory = path.join(staging, "dist/compiler/bin", `${process.platform}-${process.arch}`);
await mkdir(binaryDirectory, { recursive: true });
await copyFile(path.join(root, "compiler/oxc-spike/target/release", binaryName), path.join(binaryDirectory, binaryName));
await chmod(path.join(binaryDirectory, binaryName), 0o755);
const jsxTypes = await readFile(path.join(root, "src/native_jsx_types.d.ts"), "utf8");
await writeFile(path.join(staging, "dist/src/native_jsx_types.d.ts"), jsxTypes.replaceAll('"./jsx_binding_runtime.ts"', '"./jsx_binding_runtime.js"'));
const entry = (name) => ({ types: `./dist/${name}.d.ts`, import: `./dist/${name}.js` });
const manifest = {
  name: "@compiled-ui/runtime", version: "0.0.0-private-alpha", type: "module",
  description: "Private compiled JSX runtime integration artifact; not a published compatibility claim",
  files: ["dist", "README.md"], engines: { node: ">=24" },
  os: [process.platform], cpu: [process.arch],
  bin: {"compiled-ui-compiler": `./dist/compiler/bin/${process.platform}-${process.arch}/${binaryName}`},
  exports: {
    ".": entry("src/native_runtime_api"),
    "./core": entry("src/native_runtime_api"),
    "./dom": entry("src/native_dom_api"),
    "./three": entry("src/three_host"),
    "./three/jsx-runtime": entry("src/three_jsx_runtime"),
    "./three/jsx-dev-runtime": entry("src/three_jsx_dev_runtime"),
    "./react": entry("src/react_native_adapter"),
    "./vite": entry("compiler/vite_native_plugin"),
    "./jsx-runtime": entry("src/native_jsx_runtime"),
    "./jsx-dev-runtime": entry("src/native_jsx_dev_runtime"),
  },
  dependencies: { "magic-string": "^1.4.3" },
  peerDependencies: { vite: "^8.3.1", react: "^19.3.0", three: "^0.186.1" },
  peerDependenciesMeta: { react: { optional: true }, three: { optional: true } },
};
await writeFile(path.join(staging, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
await writeFile(path.join(staging, "README.md"), `# Compiled UI private integration artifact\n\nThis is a platform-specific private alpha build, not a published package. Native authored TSX requires \`nativeModulePlugin()\` from \`@compiled-ui/runtime/vite\`. Use \`jsxImportSource: "@compiled-ui/runtime"\` for types. Uncompiled hooks fail explicitly. The package includes a Rust/OXC compiler executable for ${process.platform}-${process.arch}; consuming this artifact needs no Cargo build. Native HMR remounts roots; applications own teardown. State-preserving HMR, React library parity, other platform binaries, and performance/maintenance claims are not established.\n`);
run("pnpm", ["pack", "--out", path.join(root, ".cache/compiled-ui-runtime.tgz")], process.env, staging);
const files = [];
const collect = async (directory) => {
  for (const entry of await readdir(directory, {withFileTypes:true})) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(filename);
    else files.push({file:path.relative(staging,filename),bytes:(await stat(filename)).size});
  }
};
await collect(path.join(staging,"dist"));
const tarball = await readFile(path.join(root,".cache/compiled-ui-runtime.tgz"));
await writeFile(path.join(staging,"package-report.json"), JSON.stringify({
  schemaVersion:1,platform:`${process.platform}-${process.arch}`,published:false,
  tarballBytes:tarball.length,tarballSha256:createHash("sha256").update(tarball).digest("hex"),
  compilerBinaryBytes:(await stat(path.join(binaryDirectory,binaryName))).size,
  emittedJavaScriptBytes:files.filter(entry=>entry.file.endsWith(".js")).reduce((total,entry)=>total+entry.bytes,0),
  note:"Emitted distribution bytes are not a minified consumer bundle or React size comparison.", files,
},null,2)+"\n");
