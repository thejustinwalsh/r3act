import { spawnSync } from "node:child_process";
import { mkdir, rm, writeFile, copyFile, chmod, readFile, stat, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, ".cache/owner-row-fusion-package-v1");
const staging = path.join(outputDirectory, "staging");
const tarballPath = path.join(outputDirectory, "compiled-ui-runtime.tgz");
const cargoTargetDirectory = path.join(outputDirectory, "cargo-target");
const checkpointDirectory = path.join(root, "implementation/2026-10-13-owner-row-fusion");
const checkpointStatusPath = path.join(checkpointDirectory, "status.json");
const checkpointStatus = JSON.parse(await readFile(checkpointStatusPath, "utf8"));
const checkpointArchivePath = path.join(checkpointDirectory, checkpointStatus.archive);
const expectedCheckpointStatusSha256 = "7b7ef2d7db881a270cc20d77989f3b698fc8bdd84a3183a7b5b285e7bad69d10";
const expectedCheckpointArchiveSha256 = "cbe4ce3f557314fa093ac51214a2ba5e9cf0a5f0ad67b5429ce3a95a5e59a382";
const hashFile = async (filename) => createHash("sha256").update(await readFile(filename)).digest("hex");
const checkpointStatusSha256 = await hashFile(checkpointStatusPath);
const checkpointArchiveSha256 = await hashFile(checkpointArchivePath);
if (checkpointStatusSha256 !== expectedCheckpointStatusSha256 || checkpointArchiveSha256 !== expectedCheckpointArchiveSha256 ||
    checkpointArchiveSha256 !== checkpointStatus.archiveSha256) {
  throw new Error("Owner-row-fusion source archive does not match its status hash");
}
const sourceInputs = Object.fromEntries(Object.entries(checkpointStatus.sourceAndBuildSha256)
  .filter(([filename]) => filename.startsWith("src/") || filename.startsWith("compiler/") ||
    ["package.json", "pnpm-lock.yaml", "tsconfig.native-tooling.json"].includes(filename))
  .sort(([left], [right]) => left.localeCompare(right)));
const verifySourceInputs = async () => {
  const mismatches = [];
  for (const [filename, expected] of Object.entries(sourceInputs)) {
    const observed = await hashFile(path.join(root, filename));
    if (observed !== expected) mismatches.push({ filename, expected, observed });
  }
  return mismatches;
};
const verifyCheckpointSnapshot = async () => ({
  statusSha256: await hashFile(checkpointStatusPath),
  archiveSha256: await hashFile(checkpointArchivePath),
});
const checkpointBefore = await verifyCheckpointSnapshot();
if (checkpointBefore.statusSha256 !== checkpointStatusSha256 || checkpointBefore.archiveSha256 !== checkpointArchiveSha256) {
  throw new Error("Fusion checkpoint changed while starting package build");
}
const sourceMismatchesBefore = await verifySourceInputs();
if (sourceMismatchesBefore.length) throw new Error(`Checkpoint source inputs differ before build: ${JSON.stringify(sourceMismatchesBefore.slice(0, 5))}`);
const toolInputs = Object.fromEntries(await Promise.all([
  ["tsconfig", "tsconfig.native-package.owner-row-fusion-v1.json"],
  ["buildScript", "scripts/build_native_package_owner_row_fusion_v1.mjs"],
  ["consumerVerifier", "scripts/verify_native_package_owner_row_fusion_v1.mjs"],
  ["browserVerifier", "scripts/verify_native_package_browser_owner_row_fusion_v1.mjs"],
].map(async ([key, filename]) => [key, { path: filename, sha256: await hashFile(path.join(root, filename)) }])));
if (process.platform !== "darwin" || process.arch !== "arm64") {
  throw new Error(`This package qualification is scoped to darwin-arm64; received ${process.platform}-${process.arch}`);
}
const run = (command, args, env = process.env, cwd = root) => {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status})`);
};
await rm(staging, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await mkdir(staging, { recursive: true });
run("pnpm", ["exec", "tsgo", "-p", "tsconfig.native-package.owner-row-fusion-v1.json"]);
// Carry every authored source referenced by an emitted JS or declaration map
// into the package and make the map URL package-relative.
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
if (mapFiles.length === 0) throw new Error("TypeScript emitted no JavaScript or declaration source maps");
const sourceMapRecords = [];
const additionalAuthoredDeclarationSources = ["src/native_jsx_types.d.ts"];
for (const relativeSource of additionalAuthoredDeclarationSources) {
  const originalSourcePath = path.join(root, relativeSource);
  const packagedSourcePath = path.join(sourcesDirectory, relativeSource);
  const sourceContents = await readFile(originalSourcePath, "utf8");
  const expectedSourceHash = sourceInputs[relativeSource];
  if (!expectedSourceHash || createHash("sha256").update(sourceContents).digest("hex") !== expectedSourceHash) {
    throw new Error(`Additional authored declaration does not match checkpoint input: ${relativeSource}`);
  }
  await mkdir(path.dirname(packagedSourcePath), { recursive: true });
  await writeFile(packagedSourcePath, sourceContents);
}
for (const mapFile of mapFiles) {
  const sourceMap = JSON.parse(await readFile(mapFile, "utf8"));
  if (!Array.isArray(sourceMap.sources) || sourceMap.sources.length === 0) {
    throw new Error(`Source map has no sources: ${path.relative(staging, mapFile)}`);
  }
  const rewrittenSources = [];
  const sourcesContent = [];
  for (const source of sourceMap.sources) {
    if (typeof source !== "string" || source.startsWith("/") || /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(source)) {
      throw new Error(`Unsupported non-relative source map entry ${source} in ${path.relative(staging, mapFile)}`);
    }
    const sourceRoot = sourceMap.sourceRoot ?? "";
    if (sourceRoot && (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(sourceRoot) || path.isAbsolute(sourceRoot))) {
      throw new Error(`Unsupported sourceRoot ${sourceRoot} in ${path.relative(staging, mapFile)}`);
    }
    const originalSourcePath = path.resolve(path.dirname(mapFile), sourceRoot, source);
    const sourceRelativeToRoot = path.relative(root, originalSourcePath);
    if (sourceRelativeToRoot === ".." || sourceRelativeToRoot.startsWith(`..${path.sep}`) || path.isAbsolute(sourceRelativeToRoot)) {
      throw new Error(`Source map escapes project sources: ${source} in ${path.relative(staging, mapFile)}`);
    }
    const sourceContents = await readFile(originalSourcePath, "utf8");
    const normalizedSourcePath = sourceRelativeToRoot.split(path.sep).join("/");
    const expectedSourceHash = sourceInputs[normalizedSourcePath];
    if (!expectedSourceHash || createHash("sha256").update(sourceContents).digest("hex") !== expectedSourceHash) {
      throw new Error(`Mapped source does not match checkpoint input: ${normalizedSourcePath}`);
    }
    const packagedSourcePath = path.join(sourcesDirectory, sourceRelativeToRoot);
    await mkdir(path.dirname(packagedSourcePath), { recursive: true });
    await writeFile(packagedSourcePath, sourceContents);
    rewrittenSources.push(path.relative(path.dirname(mapFile), packagedSourcePath).split(path.sep).join("/"));
    sourcesContent.push(sourceContents);
    sourceMapRecords.push({
      map: path.relative(staging, mapFile).split(path.sep).join("/"),
      source: path.relative(staging, packagedSourcePath).split(path.sep).join("/"),
    });
  }
  sourceMap.sources = rewrittenSources;
  sourceMap.sourceRoot = "";
  sourceMap.sourcesContent = sourcesContent;
  await writeFile(mapFile, JSON.stringify(sourceMap));
}
run("cargo", ["build", "--locked", "--release", "--target-dir", cargoTargetDirectory, "--manifest-path", "compiler/oxc-spike/Cargo.toml", "--bin", "ui-graph-compiler-spike"],
  {
    ...process.env,
    CARGO_HOME: process.env.CARGO_HOME ?? path.join(root, ".cache/cargo"),
    CARGO_TARGET_DIR: cargoTargetDirectory,
  });
const suffix = process.platform === "win32" ? ".exe" : "";
const binaryName = `ui-graph-compiler-spike${suffix}`;
const binaryDirectory = path.join(staging, "dist/compiler/bin", `${process.platform}-${process.arch}`);
await mkdir(binaryDirectory, { recursive: true });
await copyFile(path.join(cargoTargetDirectory, "release", binaryName), path.join(binaryDirectory, binaryName));
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
await writeFile(path.join(staging, "README.md"), `# Compiled UI private integration artifact\n\nThis is a platform-specific private alpha build, not a published package. Native authored TSX requires \`nativeModulePlugin()\` from \`@compiled-ui/runtime/vite\`. Use \`jsxImportSource: "@compiled-ui/runtime"\` for types. Uncompiled hooks fail explicitly. The package includes a Rust/OXC compiler executable for ${process.platform}-${process.arch}; consuming this artifact needs no Cargo build. Native HMR remounts roots; applications own teardown. State-preserving HMR, React library parity, other platform binaries, and performance/maintenance claims are not established.\n\nJavaScript and declaration source maps resolve to authored TypeScript files under \`sources/\` in this package, so editor and debugger navigation works from an installed copy without access to the original checkout.\n`);
run("pnpm", ["pack", "--out", tarballPath], process.env, staging);
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
const sourceMismatchesAfter = await verifySourceInputs();
if (sourceMismatchesAfter.length) throw new Error(`Checkpoint source inputs changed during build: ${JSON.stringify(sourceMismatchesAfter.slice(0, 5))}`);
const checkpointAfter = await verifyCheckpointSnapshot();
if (checkpointAfter.statusSha256 !== checkpointStatusSha256 || checkpointAfter.archiveSha256 !== checkpointArchiveSha256 ||
    checkpointAfter.statusSha256 !== expectedCheckpointStatusSha256 || checkpointAfter.archiveSha256 !== expectedCheckpointArchiveSha256) {
  throw new Error("Fusion checkpoint status or archive changed during package build");
}
const tarball = await readFile(tarballPath);
await writeFile(path.join(outputDirectory,"package-report.json"), JSON.stringify({
  schemaVersion:1,platform:`${process.platform}-${process.arch}`,published:false,
  tarballBytes:tarball.length,tarballSha256:createHash("sha256").update(tarball).digest("hex"),
  compilerBinaryBytes:(await stat(path.join(binaryDirectory,binaryName))).size,
  emittedJavaScriptBytes:files.filter(entry=>entry.file.endsWith(".js")).reduce((total,entry)=>total+entry.bytes,0),
  buildInputs:{tsconfig:"tsconfig.native-package.owner-row-fusion-v1.json",rustTargetDirectory:path.relative(root,cargoTargetDirectory)},
  checkpoint:{statusPath:path.relative(root,checkpointStatusPath),statusSha256:checkpointStatusSha256,observedStatusSha256:checkpointAfter.statusSha256,
    archivePath:path.relative(root,checkpointArchivePath),archiveSha256:checkpointArchiveSha256,observedArchiveSha256:checkpointAfter.archiveSha256,
    sourceAndBuildSha256:sourceInputs},
  sourceInputs:{sha256:sourceInputs,preBuildMismatches:sourceMismatchesBefore,postBuildMismatches:sourceMismatchesAfter},
  toolInputs,
  note:"Darwin arm64 private-package integration qualification only; emitted distribution bytes are not a minified consumer bundle or React size comparison.",
  sourceMapPolicy:{mapCount:mapFiles.length,packageSourceDirectory:"sources",inlineSources:true,
    additionalAuthoredDeclarationSources,rewrittenEntries:sourceMapRecords}, files,
},null,2)+"\n");
