import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const stage = path.dirname(fileURLToPath(import.meta.url));
const node = "/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node";
const binary = path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const outputArg = process.argv.indexOf("--proof-dir");
assert.ok(outputArg >= 0 && process.argv[outputArg + 1], "usage: node build-gate.mjs --proof-dir ABSOLUTE_NEW_DIR");
const proofDir = path.resolve(process.argv[outputArg + 1]);
assert.ok(path.isAbsolute(proofDir) && proofDir.startsWith(path.join(root, "implementation/2026-10-17-scoped-structure/benchmark/")));
assert.equal(process.version, "v24.18.0", `Node v24.18.0 required; got ${process.version}`);
const sourceExtensions = new Set([".ts", ".tsx", ".mjs", ".rs"]);
const collect = async (directory, output = []) => {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.name === "target" || item.name === "node_modules" || item.name.startsWith(".")) continue;
    const filename = path.join(directory, item.name);
    if (item.isDirectory()) await collect(filename, output);
    else if (sourceExtensions.has(path.extname(item.name))) output.push(path.relative(root, filename).replaceAll(path.sep, "/"));
  }
  return output;
};
const sourcePaths = ["package.json", "pnpm-lock.yaml", "vite.config.ts", "deno.json", "compiler/oxc-spike/Cargo.toml", "compiler/oxc-spike/Cargo.lock"];
sourcePaths.push(...await collect(path.join(root, "src")));
sourcePaths.push(...await collect(path.join(root, "compiler")));
sourcePaths.push(...[
  "implementation/2026-10-17-scoped-structure/benchmark/index.html",
  "implementation/2026-10-17-scoped-structure/benchmark/entry.ts",
  "implementation/2026-10-17-scoped-structure/benchmark/native_arm.tsx",
  "implementation/2026-10-17-scoped-structure/benchmark/react_arm.tsx",
  "implementation/2026-10-17-scoped-structure/benchmark/vite.config.ts",
  "implementation/2026-10-17-scoped-structure/benchmark/build-gate.mjs",
  "implementation/2026-10-17-scoped-structure/benchmark/run-pair.mjs",
]);
const uniqueSources = [...new Set(sourcePaths)].sort();
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (filename) => sha(await readFile(filename));
const exists = async (filename) => { try { await stat(filename); return true; } catch (e) { if (e.code === "ENOENT") return false; throw e; } };
assert.equal(await exists(proofDir), false, `refusing existing proof directory ${proofDir}`);
await mkdir(proofDir, { recursive: true });
const lock = { schemaVersion: "scoped-structure-pair-source-lock-v1", status: "FROZEN_BEFORE_BUILD",
  sourcePaths: uniqueSources, inputs: [], compiler: { path: path.relative(root, binary).replaceAll(path.sep, "/"), sha256: await hashFile(binary) } };
for (const relative of uniqueSources) lock.inputs.push({ path: relative, sha256: await hashFile(path.join(root, relative)) });
await writeFile(path.join(proofDir, "source-lock.json"), JSON.stringify(lock, null, 2) + "\n", { flag: "wx" });
const command = path.join(root, "node_modules/vite/bin/vite.js");
const stdoutPath = path.join(proofDir, "vite.stdout.log");
const stderrPath = path.join(proofDir, "vite.stderr.log");
const child = spawn(node, [command, "build", "--config", path.join(stage, "vite.config.ts")], {
  cwd: root, env: { ...process.env, STRUCTURAL_PAIR_PROOF_DIR: proofDir }, stdio: ["ignore", "pipe", "pipe"],
});
const stdout = []; const stderr = [];
child.stdout.on("data", (chunk) => stdout.push(chunk));
child.stderr.on("data", (chunk) => stderr.push(chunk));
let spawnError = null;
const exitCode = await new Promise((resolve) => {
  child.once("error", (error) => { spawnError = String(error); resolve(127); });
  child.once("close", (code) => resolve(code ?? 1));
});
await writeFile(stdoutPath, Buffer.concat(stdout), { flag: "wx" });
await writeFile(stderrPath, Buffer.concat(stderr), { flag: "wx" });
const transformed = [];
for (const filename of ["native_arm.tsx.js", "react_arm.tsx.js"]) {
  const file = path.join(proofDir, "transforms", filename);
  if (await exists(file)) transformed.push({ path: path.relative(root, file).replaceAll(path.sep, "/"), sha256: await hashFile(file), bytes: (await stat(file)).size });
}
const nativeTransform = await readFile(path.join(proofDir, "transforms/native_arm.tsx.js"), "utf8").catch(() => "");
const reactTransform = await readFile(path.join(proofDir, "transforms/react_arm.tsx.js"), "utf8").catch(() => "");
const transformAssertions = {
  nativeComponentLowering: /__nativeDefineComponent\(/.test(nativeTransform),
  nativeKeyedCollectionLowering: /renderCollectionAt/.test(nativeTransform),
  nativeOwnerStateProgram: /ownerUpdateProgram:/.test(nativeTransform) && /stateLayout:/.test(nativeTransform) && /moduleRevision:/.test(nativeTransform),
  reactCompilerRuntime: /from ["']react\/compiler-runtime["']/.test(reactTransform),
  reactMemoCache: /\b_c\(\d+\)/.test(reactTransform) && /if \(\$\[\d+\] !==/.test(reactTransform),
};
const walk = async (directory) => {
  const result = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, item.name);
    if (item.isDirectory()) result.push(...await walk(target));
    else result.push(target);
  }
  return result;
};
const assets = [];
if (await exists(path.join(proofDir, "dist"))) {
  for (const filename of await walk(path.join(proofDir, "dist"))) assets.push({
    path: path.relative(root, filename).replaceAll(path.sep, "/"),
    urlPath: "/" + path.relative(path.join(proofDir, "dist"), filename).replaceAll(path.sep, "/"),
    sha256: await hashFile(filename), bytes: (await stat(filename)).size,
  });
}
const inputAudit = [];
for (const item of lock.inputs) inputAudit.push({ path: item.path, expected: item.sha256, actual: await hashFile(path.join(root, item.path)) });
const binaryAfter = await hashFile(binary);
const proof = { schemaVersion: "scoped-structure-pair-build-proof-v1",
  status: exitCode === 0 && !spawnError && transformed.length === 2 && Object.values(transformAssertions).every(Boolean) && assets.length > 0 &&
    inputAudit.every((item) => item.actual === item.expected) && binaryAfter === lock.compiler.sha256
    ? "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW" : "BUILD_FAILED_OR_INCOMPLETE",
  exitCode, nodeVersion: process.version, command: [node, command, "build", "--config", path.join(stage, "vite.config.ts")],
  sourceLockSha256: sha(await readFile(path.join(proofDir, "source-lock.json"))),
  compiler: { ...lock.compiler, sha256After: binaryAfter }, transformed, transformAssertions, assets, inputAudit, errors: spawnError ? [spawnError] : [],
  logs: { stdout: path.relative(root, stdoutPath).replaceAll(path.sep, "/"), stderr: path.relative(root, stderrPath).replaceAll(path.sep, "/") } };
await writeFile(path.join(proofDir, "build-proof.json"), JSON.stringify(proof, null, 2) + "\n", { flag: "wx" });
if (proof.status !== "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW") process.exitCode = exitCode || 1;
