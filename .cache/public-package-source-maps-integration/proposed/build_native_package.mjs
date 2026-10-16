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
// Ship authored TypeScript beside the package and rewrite emitted JS and
// declaration maps to resolve within that package after installation.
const dist = path.join(staging, "dist");
const sourcesDirectory = path.join(staging, "sources");
const mapFiles = [];
const collectMaps = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectMaps(filename);
    else if (entry.name.endsWith(".js.map") || entry.name.endsWith(".d.ts.map")) mapFiles.push(filename);
  }
};
await collectMaps(dist);
if (mapFiles.length === 0) throw new Error("TypeScript emitted no JS or declaration source maps");
const sourceHashes = new Map();
for (const mapFile of mapFiles) {
  const map = JSON.parse(await readFile(mapFile, "utf8"));
  if (!Array.isArray(map.sources) || map.sources.length === 0) throw new Error(`Source map has no sources: ${mapFile}`);
  const nextSources = [];
  const sourcesContent = [];
  for (const source of map.sources) {
    if (typeof source !== "string" || source.startsWith("/") || /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(source)) {
      throw new Error(`Unsupported source map URL ${source} in ${mapFile}`);
    }
    const sourceRoot = map.sourceRoot ?? "";
    if (sourceRoot && (path.isAbsolute(sourceRoot) || /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(sourceRoot))) {
      throw new Error(`Unsupported sourceRoot ${sourceRoot} in ${mapFile}`);
    }
    const originalSource = path.resolve(path.dirname(mapFile), sourceRoot, source);
    const projectRelative = path.relative(root, originalSource);
    if (projectRelative === ".." || projectRelative.startsWith(`..${path.sep}`) || path.isAbsolute(projectRelative)) {
      throw new Error(`Source map leaves project root: ${source}`);
    }
    const contents = await readFile(originalSource, "utf8");
    const packagedSource = path.join(sourcesDirectory, projectRelative);
    await mkdir(path.dirname(packagedSource), { recursive: true });
    await writeFile(packagedSource, contents);
    nextSources.push(path.relative(path.dirname(mapFile), packagedSource).split(path.sep).join("/"));
    sourcesContent.push(contents);
    sourceHashes.set(path.relative(staging, packagedSource).split(path.sep).join("/"),
      createHash("sha256").update(contents).digest("hex"));
  }
  map.sources = nextSources;
  map.sourceRoot = "";
  map.sourcesContent = sourcesContent;
  await writeFile(mapFile, JSON.stringify(map));
}
// This authored declaration participates in JSX editor navigation but is not
// emitted from a mapped TS source, so carry it explicitly too.
const authoredDeclarations = ["src/native_jsx_types.d.ts"];
for (const relativePath of authoredDeclarations) {
  const contents = await readFile(path.join(root, relativePath), "utf8");
  const destination = path.join(sourcesDirectory, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, contents);
  sourceHashes.set(path.relative(staging, destination).split(path.sep).join("/"),
    createHash("sha256").update(contents).digest("hex"));
}
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
  files: ["dist", "sources", "README.md"], engines: { node: ">=24" },
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
await writeFile(path.join(staging, "README.md"), `# Compiled UI private integration artifact\n\nThis is a platform-specific private alpha build, not a published package. Native authored TSX requires \`nativeModulePlugin()\` from \`@compiled-ui/runtime/vite\`. Use \`jsxImportSource: "@compiled-ui/runtime"\` for types. Uncompiled hooks fail explicitly. The package includes a Rust/OXC compiler executable for ${process.platform}-${process.arch}; consuming this artifact needs no Cargo build. Native HMR remounts roots; applications own teardown. State-preserving HMR, React library parity, other platform binaries, and performance/maintenance claims are not established.\n\nJavaScript and declaration source maps resolve to authored TypeScript files under \`sources/\` in the installed package for editor and debugger navigation.\n`);
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
await collect(path.join(staging,"sources"));
const tarball = await readFile(path.join(root,".cache/compiled-ui-runtime.tgz"));
await writeFile(path.join(staging,"package-report.json"), JSON.stringify({
  schemaVersion:1,platform:`${process.platform}-${process.arch}`,published:false,
  tarballBytes:tarball.length,tarballSha256:createHash("sha256").update(tarball).digest("hex"),
  compilerBinaryBytes:(await stat(path.join(binaryDirectory,binaryName))).size,
  emittedJavaScriptBytes:files.filter(entry=>entry.file.endsWith(".js")).reduce((total,entry)=>total+entry.bytes,0),
  note:"Emitted distribution bytes are not a minified consumer bundle or React size comparison.", files,
  sourceMapPolicy:{mapCount:mapFiles.length,packageSourceDirectory:"sources",inlineSources:true,
    authoredDeclarations,packagedSources:[...sourceHashes].map(([file,sha256])=>({file,sha256})).sort((a,b)=>a.file.localeCompare(b.file))},
},null,2)+"\n");
