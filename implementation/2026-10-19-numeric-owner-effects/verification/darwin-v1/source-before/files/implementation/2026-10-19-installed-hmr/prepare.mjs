import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, "../..");
const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
assert.ok(args.includes("--proof-dir"), "usage: node prepare.mjs --proof-dir NEW_DIR");
const proof = path.resolve(root, option("--proof-dir"));
assert.ok(proof.startsWith(`${unit}${path.sep}`));
assert.equal(process.version, "v24.18.0");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hash = async file => sha(await readFile(file));
const files = async directory => {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(file));
    else if (entry.isFile()) result.push(file);
    else throw new Error(`unexpected source entry: ${file}`);
  }
  return result.sort();
};
const run = async (name, command, argv, cwd, deadlineMs = 180_000) => {
  const out = [], err = [];
  const child = spawn(command, argv, { cwd, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", chunk => out.push(chunk));
  child.stderr.on("data", chunk => err.push(chunk));
  let stop = null;
  const kill = reason => {
    stop ??= reason;
    if (child.pid) try { process.kill(-child.pid, "SIGKILL"); } catch {}
  };
  const interrupt = () => kill("signal");
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  const timer = setTimeout(() => kill("deadline"), deadlineMs);
  const exit = await new Promise(resolve => {
    child.once("error", () => resolve(127));
    child.once("close", code => resolve(code ?? 1));
  });
  clearTimeout(timer);
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", interrupt);
  await writeFile(path.join(proof, `${name}.stdout.log`), Buffer.concat(out), { flag: "wx" });
  await writeFile(path.join(proof, `${name}.stderr.log`), Buffer.concat(err), { flag: "wx" });
  await writeFile(path.join(proof, `${name}.json`), JSON.stringify({ command, argv, exit, stop }, null, 2) + "\n", { flag: "wx" });
  assert.equal(exit, 0, `${name} failed; preserved logs are in ${proof}`);
  assert.equal(stop, null);
};

await mkdir(proof);
const consumer = await realpath(await mkdtemp(path.join(tmpdir(), "r3act-installed-hmr-")));
const record = { status: "STARTED", consumer, source: [], tarballs: [], installed: [], compiler: null,
  transforms: [], assets: [], node: process.version, platform: `${process.platform}-${process.arch}` };
try {
  const report = JSON.parse(await readFile(path.join(root, ".cache/r3act-package-build/report.json"), "utf8"));
  for (const [relative, expected] of Object.entries(report.sourceHashes ?? {}))
    assert.equal(await hash(path.join(root, relative)), expected, `stale package report: ${relative}`);
  const tarballs = {};
  for (const name of ["core", "vite", "host-dom", "host-three", "react-bridge"]) {
    const pkg = `@r3act/${name}`;
    const source = path.join(root, report.packages[pkg].file);
    const expected = report.packages[pkg].sha256;
    assert.equal(await hash(source), expected);
    const target = path.join(proof, "inputs", "tarballs", `${name}.tgz`);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target, constants.COPYFILE_EXCL);
    tarballs[pkg] = `file:${target}`;
    record.tarballs.push({ package: pkg, path: target, sha256: expected });
  }
  for (const source of await files(path.join(unit, "consumer"))) {
    const target = path.join(consumer, path.relative(path.join(unit, "consumer"), source));
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target, constants.COPYFILE_EXCL);
  }
  for (const source of [path.join(unit, "prepare.mjs"), path.join(unit, "verify-browser.mjs"),
    path.join(unit, "run-build-pair.mjs"), path.join(unit, "README.md"), path.join(unit, "design.md"),
    ...await files(path.join(unit, "consumer"))]) {
    const relative = path.relative(unit, source);
    const target = path.join(proof, "inputs", "source", relative);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target, constants.COPYFILE_EXCL);
    record.source.push({ relative, sha256: await hash(source) });
  }
  const manifestFile = path.join(consumer, "package.json");
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  for (const [name, url] of Object.entries(tarballs)) {
    if (name === "@r3act/vite") manifest.devDependencies[name] = url;
    else manifest.dependencies[name] = url;
  }
  await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  await writeFile(path.join(consumer, "pnpm-workspace.yaml"),
    `packages:\n  - .\noverrides:\n  "@r3act/core": ${JSON.stringify(tarballs["@r3act/core"])}\n`);
  await run("install", "pnpm", ["install", "--ignore-scripts", "--store-dir", "/Volumes/Depot/.pnpm-store"], consumer);
  for (const file of ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml"]) {
    const source = path.join(consumer, file), target = path.join(proof, "inputs", "installed-manifest", file);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target, constants.COPYFILE_EXCL);
    record.installed.push({ name: file, path: target, sha256: await hash(source) });
  }
  const packages = ["@r3act/core", "@r3act/vite", "@r3act/host-dom", "@r3act/host-three",
    "@r3act/react-bridge", "@vitejs/plugin-react", "react", "react-dom", "three", "@radix-ui/react-dialog"];
  for (const name of packages) {
    const installed = await realpath(path.join(consumer, "node_modules", name));
    assert.ok(installed.startsWith(path.join(consumer, "node_modules/.pnpm") + path.sep));
    const archive = path.join(proof, "inputs", "installed-graph", name);
    for (const source of await files(installed)) {
      const relative = path.relative(installed, source);
      const target = path.join(archive, relative);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(source, target, constants.COPYFILE_EXCL);
      record.installed.push({ name, relative, path: target, installedPath: source, sha256: await hash(source) });
    }
  }
  const binary = path.join(consumer, "node_modules/@r3act/vite", report.compilerBinary.path);
  assert.equal(await hash(binary), report.compilerBinary.sha256);
  const binaryCopy = path.join(proof, "inputs", "compiler", path.basename(binary));
  await mkdir(path.dirname(binaryCopy), { recursive: true });
  await copyFile(binary, binaryCopy, constants.COPYFILE_EXCL);
  record.compiler = { path: binaryCopy, installedPath: binary,
    sha256: await hash(binary), target: report.compilerBinary.target };
  await writeFile(path.join(proof, "input-lock.json"), JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
  await run("typecheck", path.join(consumer, "node_modules/.bin/tsgo"), ["-p", "tsconfig.json"], consumer);
  await run("build", process.execPath, ["build-capture.mjs", proof], consumer);
  for (const file of await files(path.join(proof, "transforms")))
    record.transforms.push({ path: file, sha256: await hash(file) });
  for (const file of await files(path.join(proof, "dist")))
    record.assets.push({ path: file, sha256: await hash(file), bytes: (await stat(file)).size });
  assert.ok(record.transforms.some(item => item.path.endsWith("main.tsx.js")));
  assert.ok(record.transforms.some(item => item.path.endsWith("react-panel.tsx.js")));
  assert.match(await readFile(record.transforms.find(item => item.path.endsWith("main.tsx.js")).path, "utf8"), /__nativeDefineComponent/);
  const panel = await readFile(record.transforms.find(item => item.path.endsWith("react-panel.tsx.js")).path, "utf8");
  assert.match(panel, /jsx-runtime|jsxDEV|_jsx/);
  assert.doesNotMatch(panel, /__nativeDefineComponent/);
  for (const item of record.source) assert.equal(await hash(path.join(unit, item.relative)), item.sha256);
  for (const item of record.installed) assert.equal(await hash(item.installedPath ?? item.path), item.sha256);
  assert.equal(await hash(binary), record.compiler.sha256);
  record.status = "PASS_INSTALLED_BUILD_PROOF";
} catch (error) {
  record.status = "FAIL_OR_INCOMPLETE";
  record.error = error instanceof Error ? error.stack ?? String(error) : String(error);
} finally {
  await writeFile(path.join(proof, "build-proof.json"), JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
}
if (record.status !== "PASS_INSTALLED_BUILD_PROOF") {
  console.error(record.error);
  process.exitCode = 1;
} else console.log(JSON.stringify({ status: record.status, consumer, proof }));
