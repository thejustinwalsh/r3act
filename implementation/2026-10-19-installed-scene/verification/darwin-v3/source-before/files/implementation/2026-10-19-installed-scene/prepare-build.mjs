import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, cp, mkdir, mkdtemp, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const unit = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name) => args[args.indexOf(name) + 1];
assert.ok(args.includes("--proof-dir"), "usage: node prepare-build.mjs --proof-dir NEW_PATH");
const proof = path.resolve(root, arg("--proof-dir"));
assert.ok(proof.startsWith(`${unit}${path.sep}`), "proof directory must be inside this unit");
assert.equal(process.version, "v24.18.0");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (name) => sha(await readFile(name));
const rel = (name) => path.relative(root, name).replaceAll(path.sep, "/");
const files = async (directory) => {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await files(name));
    else if (entry.isFile()) found.push(name);
    else throw new Error(`non-file source entry: ${name}`);
  }
  return found.sort();
};
const run = async (label, command, argv, cwd, maxMs = 180_000) => {
  const started = process.hrtime.bigint();
  const child = spawn(command, argv, { cwd, detached: true, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
  const out = [], err = [];
  child.stdout.on("data", chunk => out.push(chunk));
  child.stderr.on("data", chunk => err.push(chunk));
  let stopped = null, spawnError = null;
  const kill = (why) => { stopped ??= why; if (child.pid) { try { process.kill(-child.pid, "SIGKILL"); } catch {} } };
  const interrupt = () => kill("signal");
  process.once("SIGINT", interrupt); process.once("SIGTERM", interrupt);
  const timer = setTimeout(() => kill("deadline"), maxMs);
  const exit = await new Promise(resolve => {
    child.once("error", error => { spawnError = String(error); resolve(127); });
    child.once("close", code => resolve(code ?? 1));
  });
  clearTimeout(timer); process.off("SIGINT", interrupt); process.off("SIGTERM", interrupt);
  await writeFile(path.join(proof, `${label}.stdout.log`), Buffer.concat(out), { flag: "wx" });
  await writeFile(path.join(proof, `${label}.stderr.log`), Buffer.concat(err), { flag: "wx" });
  const receipt = { label, command, argv, exit, stopped, spawnError,
    elapsedMs: Number(process.hrtime.bigint() - started) / 1e6 };
  await writeFile(path.join(proof, `${label}.json`), JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
  assert.equal(exit, 0, `${label} failed; see preserved logs`);
  assert.equal(stopped, null, `${label} stopped: ${stopped}`);
  return receipt;
};

await mkdir(proof, { recursive: false });
const consumer = await mkdtemp(path.join(tmpdir(), "r3act-installed-scene-"));
const record = { status: "STARTED", consumer, node: process.version, platform: `${process.platform}-${process.arch}`,
  source: [], consumerCopies: [], tarballs: [], installedGraph: [], compiler: null,
  transforms: [], assets: [], builds: [], limitations: [] };
let failed = false, failure = null;
try {
  const report = JSON.parse(await readFile(path.join(root, ".cache/r3act-package-build/report.json"), "utf8"));
  for (const [relative, expected] of Object.entries(report.sourceHashes ?? {})) {
    const source = path.join(root, relative);
    assert.equal(await hashFile(source), expected, `package build source drift: ${relative}`);
  }
  const names = ["core", "vite", "host-dom", "host-three", "react-bridge"];
  const tarballs = {};
  for (const name of names) {
    const source = path.join(root, report.packages[`@r3act/${name}`].file);
    const expected = report.packages[`@r3act/${name}`].sha256;
    assert.equal(await hashFile(source), expected, `${name} package report differs`);
    const target = path.join(proof, "inputs", "tarballs", `${name}.tgz`);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target, constants.COPYFILE_EXCL);
    assert.equal(await hashFile(target), expected);
    tarballs[`@r3act/${name}`] = `file:${target}`;
    record.tarballs.push({ name: `@r3act/${name}`, path: rel(target), sha256: expected });
  }
  for (const source of [...await files(path.join(root, "examples/installed-scene")),
    ...await files(path.join(unit, "comparison")),
    path.join(unit, "consumer-build.mjs"), path.join(unit, "prepare-build.mjs"),
    path.join(unit, "verify-browser.mjs"), path.join(unit, "run-build-pair.mjs"),
    path.join(unit, "README.md")]) {
    const relative = rel(source), target = path.join(proof, "inputs", "source", relative);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target, constants.COPYFILE_EXCL);
    const digest = await hashFile(source);
    assert.equal(await hashFile(target), digest);
    record.source.push({ path: relative, sha256: digest });
  }
  await cp(path.join(root, "examples/installed-scene"), path.join(consumer, "example"), { recursive: true });
  for (const file of await files(path.join(consumer, "example"))) record.consumerCopies.push({
    path: file, sha256: await hashFile(file), source: rel(path.join(root, "examples/installed-scene",
      path.relative(path.join(consumer, "example"), file))) });
  for (const name of ["native", "react"]) {
    const destination = path.join(consumer, `comparison-${name}`);
    await mkdir(destination);
    await copyFile(path.join(unit, "comparison", `${name}.tsx`), path.join(destination, `${name}.tsx`));
    const html = (await readFile(path.join(unit, "comparison/index.html"), "utf8")).replace("ENTRY", name);
    await writeFile(path.join(destination, "index.html"), html);
    record.consumerCopies.push({ path: path.join(destination, `${name}.tsx`),
      sha256: await hashFile(path.join(destination, `${name}.tsx`)), source: rel(path.join(unit, "comparison", `${name}.tsx`)) });
    record.consumerCopies.push({ path: path.join(destination, "index.html"),
      sha256: await hashFile(path.join(destination, "index.html")), source: "generated-from-comparison/index.html" });
  }
  await copyFile(path.join(unit, "consumer-build.mjs"), path.join(consumer, "consumer-build.mjs"));
  record.consumerCopies.push({ path: path.join(consumer, "consumer-build.mjs"),
    sha256: await hashFile(path.join(consumer, "consumer-build.mjs")), source: rel(path.join(unit, "consumer-build.mjs")) });
  const manifest = { name: "r3act-installed-scene-consumer", private: true, type: "module",
    dependencies: { ...tarballs, "@radix-ui/react-dialog": "1.3.1", react: "19.3.0",
      "react-dom": "19.3.0", three: "0.186.1", vite: "8.3.1",
      "@vitejs/plugin-react": "5.2.0", "babel-plugin-react-compiler": "1.0.0",
      "@typescript/native-preview": "7.0.0-dev.20260707.2",
      "@types/react": "19.3.0", "@types/react-dom": "19.3.0", "@types/three": "0.186.0",
      "@types/node": "24.19.2" } };
  await writeFile(path.join(consumer, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
  await writeFile(path.join(consumer, "pnpm-workspace.yaml"),
    `packages:\n  - .\noverrides:\n  "@r3act/core": ${JSON.stringify(tarballs["@r3act/core"])}\n`);
  await run("install", "pnpm", ["install", "--ignore-scripts", "--store-dir", "/Volumes/Depot/.pnpm-store"], consumer);
  for (const name of ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml"]) {
    const target = path.join(proof, "inputs", "consumer", name);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(consumer, name), target, constants.COPYFILE_EXCL);
    record.source.push({ path: rel(target), sha256: await hashFile(target) });
  }
  const pnpmDirectory = path.join(consumer, "node_modules/.pnpm");
  const seen = new Set();
  const archiveRuntime = async (linked) => {
    let actual;
    try { actual = await realpath(linked); } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    if (seen.has(actual)) return;
    assert.ok(actual.startsWith(`${pnpmDirectory}${path.sep}`), `runtime package escaped installed store: ${actual}`);
    seen.add(actual);
    const pkg = JSON.parse(await readFile(path.join(actual, "package.json"), "utf8"));
    const relative = path.relative(pnpmDirectory, actual).split(path.sep);
    const packageDependencies = path.join(pnpmDirectory, relative[0], "node_modules");
    const archive = path.join(proof, "inputs", "installed-graph", relative[0], ...relative.slice(2));
    const rows = [];
    for (const source of await files(actual)) {
      const item = path.relative(actual, source).replaceAll(path.sep, "/");
      const destination = path.join(archive, item);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(source, destination, constants.COPYFILE_EXCL);
      const digest = await hashFile(source);
      assert.equal(await hashFile(destination), digest);
      rows.push({ path: item, sha256: digest });
    }
    record.installedGraph.push({ name: pkg.name, version: pkg.version,
      root: rel(archive), consumerRoot: actual, files: rows });
    for (const name of [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})].sort())
      await archiveRuntime(path.join(packageDependencies, name));
  };
  for (const name of ["@r3act/core", "@r3act/vite", "@r3act/host-dom", "@r3act/host-three",
    "@r3act/react-bridge", "@radix-ui/react-dialog", "react", "react-dom", "three"])
    await archiveRuntime(path.join(consumer, "node_modules", name));
  const binary = path.join(consumer, "node_modules/@r3act/vite", report.compilerBinary.path);
  assert.equal(await hashFile(binary), report.compilerBinary.sha256);
  const binaryCopy = path.join(proof, "inputs", "compiler", path.basename(binary));
  await mkdir(path.dirname(binaryCopy), { recursive: true });
  await copyFile(binary, binaryCopy);
  record.compiler = { path: rel(binaryCopy), consumerPath: binary,
    sha256: await hashFile(binaryCopy), target: report.compilerBinary.target };
  for (const item of record.consumerCopies) {
    assert.equal(await hashFile(item.path), item.sha256);
    if (!item.source.startsWith("generated-")) assert.equal(await hashFile(path.join(root, item.source)), item.sha256);
  }
  await writeFile(path.join(proof, "input-lock.json"), JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
  record.builds.push(await run("typecheck", path.join(consumer, "node_modules/.bin/tsgo"),
    ["-p", "example/tsconfig.json"], consumer));
  record.builds.push(await run("scene-build", process.execPath,
    ["consumer-build.mjs", "scene", proof], consumer));
  const sceneTransforms = await files(path.join(proof, "transforms", "scene"));
  assert.ok(sceneTransforms.length > 0, "scene has no captured transforms");
  const sceneCode = (await Promise.all(sceneTransforms.map(file => readFile(file, "utf8")))).join("\n");
  assert.match(sceneCode, /__nativeDefineComponent/);
  assert.match(sceneCode, /__nativeUseAt|__nativeUseStoreAt/);
  assert.match(sceneCode, /__nativeBoundarySite|Suspense/);
  const captures = JSON.parse(await readFile(path.join(proof, "build-scene-transforms.json"), "utf8"));
  assert.deepEqual(captures.wrapperInputs.map(item => item.phase).sort(), ["post", "pre"],
    "installed Radix wrapper pre/post bytes were not captured");
  assert.ok(captures.wrapperInputs.every(item => item.id.includes(consumer)), "wrapper resolved outside fresh consumer");
  const wrapperHash = await hashFile(captures.wrapperInputs[0].path);
  assert.equal(await hashFile(captures.wrapperInputs[1].path), wrapperHash,
    "installed Radix wrapper transformed after package resolution");
  const packagedWrapper = record.installedGraph.find(item => item.name === "@r3act/core")?.files
    .find(item => item.path === "dist/src/react_radix_dialog_adapter.js");
  assert.equal(wrapperHash, packagedWrapper?.sha256, "installed wrapper source was changed by the build pipeline");
  record.wrapperInput = { sha256: wrapperHash, unchangedInstalledPackageInput: true };
  for (const item of record.installedGraph) for (const file of item.files) {
    assert.equal(await hashFile(path.join(root, item.root, file.path)), file.sha256,
      `installed graph archive changed during build: ${item.name}/${file.path}`);
    assert.equal(await hashFile(path.join(item.consumerRoot, file.path)), file.sha256,
      `installed graph consumer changed during build: ${item.name}/${file.path}`);
  }
  for (const item of record.consumerCopies) assert.equal(await hashFile(item.path), item.sha256,
    `consumer source changed during build: ${item.path}`);
  assert.equal(await hashFile(binary), record.compiler.sha256);
  for (const file of await files(path.join(proof, "transforms"))) record.transforms.push({
    path: rel(file), sha256: await hashFile(file), bytes: (await stat(file)).size });
  for (const directory of ["wrapper-input", "wrapper-output"]) for (const file of await files(path.join(proof, directory)))
    record.transforms.push({ path: rel(file), sha256: await hashFile(file), bytes: (await stat(file)).size });
  record.transforms.push({ path: rel(path.join(proof, "build-scene-transforms.json")),
    sha256: await hashFile(path.join(proof, "build-scene-transforms.json")),
    bytes: (await stat(path.join(proof, "build-scene-transforms.json"))).size });
  for (const name of ["scene"]) {
    for (const file of await files(path.join(proof, "dist", name))) record.assets.push({ mode: name,
      path: rel(file), urlPath: `/${path.relative(path.join(proof, "dist", name), file).replaceAll(path.sep, "/")}`,
      sha256: await hashFile(file), bytes: (await stat(file)).size });
  }
  record.status = "PASS_SCENE_BUILD_PROOF";
  record.limitations.push("Scene production build is untimed proof. Build comparison requires a separate reviewed proof and authorization.");
} catch (error) { failed = true; failure = error instanceof Error ? error.stack ?? String(error) : String(error);
  record.status = "FAIL_OR_INCOMPLETE"; record.error = failure;
} finally {
  await writeFile(path.join(proof, "build-proof.json"), JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
}
if (failed) { console.error(failure); process.exitCode = 1; }
else console.log(JSON.stringify({ status: record.status, proof }));
