import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildNativeCompilerArtifact } from "./native_compiler_artifact.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = path.join(root, ".cache/r3act-package-build");
const unified = path.join(base, "unified");
const tarballs = path.join(base, "tarballs");
const names = ["core", "vite", "host-dom", "host-three", "react-bridge"];
const run = (command, args, cwd = root, env = process.env) => {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited ${result.status}`);
};
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const walk = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(filename));
    else files.push(filename);
  }
  return files;
};
const copyTree = async (source, target) => {
  await mkdir(target, { recursive: true });
  for (const filename of await walk(source)) {
    const destination = path.join(target, path.relative(source, filename));
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(filename, destination);
  }
};

await rm(base, { recursive: true, force: true });
await mkdir(tarballs, { recursive: true });
run("pnpm", ["exec", "tsgo", "-p", "tsconfig.r3act-packages.json"]);
const unifiedDist = path.join(unified, "dist");
const mapFiles = (await walk(unifiedDist)).filter((filename) =>
  filename.endsWith(".js.map") || filename.endsWith(".d.ts.map")
);
if (mapFiles.length === 0) throw new Error("TypeScript emitted no package source maps");
const sourceHashes = new Map();
for (const filename of mapFiles) {
  const map = JSON.parse(await readFile(filename, "utf8"));
  if (!Array.isArray(map.sources) || map.sources.length === 0) {
    throw new Error(`Source map has no sources: ${filename}`);
  }
  const nextSources = [];
  const contents = [];
  for (const source of map.sources) {
    if (typeof source !== "string" || path.isAbsolute(source) || /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(source)) {
      throw new Error(`Unsupported source map URL: ${source}`);
    }
    const sourceRoot = map.sourceRoot ?? "";
    if (path.isAbsolute(sourceRoot) || /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(sourceRoot)) {
      throw new Error(`Unsupported sourceRoot: ${sourceRoot}`);
    }
    const original = path.resolve(path.dirname(filename), sourceRoot, source);
    const relative = path.relative(root, original);
    if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error(`Source map escapes repository: ${source}`);
    }
    const data = await readFile(original, "utf8");
    const packaged = path.join(unified, "sources", relative);
    await mkdir(path.dirname(packaged), { recursive: true });
    await writeFile(packaged, data);
    nextSources.push(path.relative(path.dirname(filename), packaged).split(path.sep).join("/"));
    contents.push(data);
    sourceHashes.set(relative.split(path.sep).join("/"), hash(data));
  }
  map.sources = nextSources;
  map.sourceRoot = "";
  map.sourcesContent = contents;
  await writeFile(filename, JSON.stringify(map));
}
const jsxTypes = await readFile(path.join(root, "src/native_jsx_types.d.ts"), "utf8");
await writeFile(path.join(unifiedDist, "src/native_jsx_types.d.ts"),
  jsxTypes.replaceAll('"./jsx_binding_runtime.ts"', '"./jsx_binding_runtime.js"'));
await mkdir(path.join(unified, "sources/src"), { recursive: true });
await writeFile(path.join(unified, "sources/src/native_jsx_types.d.ts"), jsxTypes);
sourceHashes.set("src/native_jsx_types.d.ts", hash(jsxTypes));

const { rustTarget, compilerInfo, rustSource, artifact: compilerArtifact } =
  await buildNativeCompilerArtifact({ root, binRoot: path.join(base, "vite/dist/compiler/bin") });
const binaryRelative = `dist/compiler/bin/${compilerArtifact.file}`;
const packageStages = new Map();
for (const name of names) {
  const stage = path.join(base, name);
  packageStages.set(name, stage);
  await mkdir(stage, { recursive: true });
  const manifest = JSON.parse(await readFile(path.join(root, "packages", name, "package.json"), "utf8"));
  if (manifest.dependencies?.["@r3act/core"] === "workspace:*") {
    manifest.dependencies["@r3act/core"] = "0.0.0-private-alpha";
  }
  manifest.files = ["dist", "sources", "LICENSE", "README.md"];
  manifest.engines = { node: ">=24" };
  if (name === "vite") {
    manifest.bin = { [`r3act-compiler-${process.platform}-${process.arch}`]: `./${binaryRelative}` };
  }
  await writeFile(path.join(stage, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
  await copyFile(path.join(root, "LICENSE"), path.join(stage, "LICENSE"));
  const platformNote = name === "vite"
    ? `\nThe bundled Rust/OXC compiler and the r3act-compiler-${process.platform}-${process.arch} executable target ${rustTarget} (${process.platform}-${process.arch}). On another platform, supply a compatible executable through nativeModulePlugin({ compilerBinary: "/path/to/compiler" }). This tarball does not provide other platform binaries.\n`
    : "";
  await writeFile(path.join(stage, "README.md"),
    `# @r3act/${name}\n\nPrivate alpha installation artifact. This package is unpublished and its namespace is not reserved. See the repository README and final master plan for the supported native TSX subset and evidence limits.\n${platformNote}`);
}
for (const [name, section] of [["core", "src"], ["vite", "compiler"]]) {
  const stage = packageStages.get(name);
  await copyTree(path.join(unifiedDist, section), path.join(stage, "dist", section));
  await copyTree(path.join(unified, "sources", section), path.join(stage, "sources", section));
}
const wrappers = {
  "host-dom": { "index": "@r3act/core/dom" },
  "host-three": {
    "index": "@r3act/core/three",
    "jsx-runtime": "@r3act/core/three/jsx-runtime",
    "jsx-dev-runtime": "@r3act/core/three/jsx-dev-runtime",
  },
  "react-bridge": { "index": "@r3act/core/react" },
};
for (const [name, entries] of Object.entries(wrappers)) {
  const dist = path.join(packageStages.get(name), "dist");
  await mkdir(dist, { recursive: true });
  for (const [entry, target] of Object.entries(entries)) {
    await writeFile(path.join(dist, `${entry}.js`), `export * from ${JSON.stringify(target)};\n`);
    await writeFile(path.join(dist, `${entry}.d.ts`), `export * from ${JSON.stringify(target)};\n`);
  }
}

const report = { schemaVersion: 1, published: false, platform: `${process.platform}-${process.arch}`, packages: {} };
for (const name of names) {
  const stage = packageStages.get(name);
  const target = path.join(tarballs, `r3act-${name}.tgz`);
  run("pnpm", ["pack", "--out", target], stage);
  if (name === "vite") {
    const listing = spawnSync("tar", ["-tvf", target], { encoding: "utf8" });
    if (listing.error || listing.status !== 0) {
      throw new Error(`Unable to inspect packed Rust compiler mode: ${listing.error ?? listing.stderr}`);
    }
    const binaryEntry = listing.stdout.split("\n").find((line) =>
      line.endsWith(`package/${binaryRelative}`)
    );
    if (!binaryEntry || !binaryEntry.split(/\s+/, 1)[0].includes("x")) {
      throw new Error("Packed Rust compiler lost its executable mode");
    }
  }
  const files = (await walk(stage)).map((filename) => path.relative(stage, filename).split(path.sep).join("/"));
  const bytes = await readFile(target);
  report.packages[`@r3act/${name}`] = {
    file: path.relative(root, target).split(path.sep).join("/"),
    bytes: bytes.length,
    sha256: hash(bytes),
    files,
  };
}
report.compilerBinary = { target: `${process.platform}-${process.arch}`, path: binaryRelative,
  rustTarget, compilerInfo, sha256: compilerArtifact.sha256, bytes: compilerArtifact.bytes,
  manifest: "dist/compiler/bin/manifest.json", rustSource };
report.sourceHashes = Object.fromEntries([...sourceHashes].sort(([a], [b]) => a.localeCompare(b)));
await writeFile(path.join(base, "report.json"), JSON.stringify(report, null, 2) + "\n");
