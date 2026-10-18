import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compiledNumericDescriptors } from "../../../compiler/compiled_numeric_descriptor_test_helpers.mjs";

const root = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const stage = path.dirname(fileURLToPath(import.meta.url));
const node = "/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node";
const compiler = path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const flag = process.argv.indexOf("--proof-dir");
assert.ok(flag >= 0 && process.argv[flag + 1], "usage: node build-gate.mjs --proof-dir ABSOLUTE_NEW_DIR");
const proofDir = path.resolve(process.argv[flag + 1]);
assert.ok(proofDir.startsWith(path.join(root, "implementation/2026-10-18-first-pass/benchmark/")));
assert.equal(process.version, "v24.18.0", `Node v24.18.0 required, got ${process.version}`);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (filename) => sha(await readFile(filename));
const walk = async (directory) => {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["target", "node_modules", ".git"].includes(entry.name)) continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(filename));
    else if (/\.(ts|tsx|mjs|rs|json|yaml)$/.test(entry.name)) output.push(filename);
  }
  return output;
};
const trackedRoots = ["src", "compiler", "packages", "scripts"];
const sourcePaths = new Set(["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.r3act-packages.json", "vite.config.ts",
  "deno.json", "deno.lock", "compiler/oxc-spike/Cargo.toml", "compiler/oxc-spike/Cargo.lock"]);
for (const base of trackedRoots) for (const filename of await walk(path.join(root, base))) sourcePaths.add(path.relative(root, filename).replaceAll(path.sep, "/"));
for (const entry of await readdir(stage)) if (/\.(ts|tsx|mjs|html)$/.test(entry)) sourcePaths.add(path.relative(root, path.join(stage, entry)).replaceAll(path.sep, "/"));
const inputs = [...sourcePaths].sort();
await mkdir(proofDir, { recursive: false });
const lock = { schemaVersion: "first-pass-joint-source-lock-v1", status: "FROZEN_BEFORE_BUILD", inputs: [],
  compiler: { path: path.relative(root, compiler).replaceAll(path.sep, "/"), sha256: await hashFile(compiler) } };
for (const input of inputs) lock.inputs.push({ path: input, sha256: await hashFile(path.join(root, input)) });
const lockBytes = Buffer.from(JSON.stringify(lock, null, 2) + "\n");
await writeFile(path.join(proofDir, "source-lock.json"), lockBytes, { flag: "wx" });
const command = path.join(root, "node_modules/vite/bin/vite.js");
const child = spawn(node, [command, "build", "--config", path.join(stage, "vite.config.ts")], {
  cwd: root, env: { ...process.env, FIRST_PASS_PAIR_PROOF_DIR: proofDir }, stdio: ["ignore", "pipe", "pipe"],
});
const stdout = []; const stderr = [];
child.stdout.on("data", (chunk) => stdout.push(chunk)); child.stderr.on("data", (chunk) => stderr.push(chunk));
let spawnError = null;
const exitCode = await new Promise((resolve) => {
  child.once("error", (error) => { spawnError = String(error); resolve(127); });
  child.once("close", (code) => resolve(code ?? 1));
});
await writeFile(path.join(proofDir, "vite.stdout.log"), Buffer.concat(stdout), { flag: "wx" });
await writeFile(path.join(proofDir, "vite.stderr.log"), Buffer.concat(stderr), { flag: "wx" });
const transformFiles = ["native_arm.tsx.js", "react_arm.tsx.js"].map((name) => path.join(proofDir, "transforms", name));
const transformed = [];
for (const filename of transformFiles) { try { transformed.push({ path: path.relative(root, filename).replaceAll(path.sep, "/"), sha256: await hashFile(filename), bytes: (await stat(filename)).size }); } catch {} }
const native = await readFile(transformFiles[0], "utf8").catch(() => "");
const reactCode = await readFile(transformFiles[1], "utf8").catch(() => "");
const assertions = {
  nativeComponent: /__nativeDefineComponent\(/.test(native),
  nativeKeyedCollection: /renderCollectionAt/.test(native),
  nativeStateLayout: /stateLayout:/.test(native) && /moduleRevision:/.test(native),
  nativeNumericClosedProgram: /ownerUpdateProgram:/.test(native) && compiledNumericDescriptors(native).some((item) => item.closedExpressionKinds.includes("input")),
  reactCompilerRuntime: /react\/compiler-runtime/.test(reactCode),
  reactMemoCache: /\b_c\(\d+\)/.test(reactCode),
};
const assets = [];
const dist = path.join(proofDir, "dist");
const collectAssets = async (dir) => { for (const entry of await readdir(dir, { withFileTypes: true })) { const filename = path.join(dir, entry.name); if (entry.isDirectory()) await collectAssets(filename); else assets.push({ path: path.relative(root, filename).replaceAll(path.sep, "/"), urlPath: "/" + path.relative(dist, filename).replaceAll(path.sep, "/"), sha256: await hashFile(filename), bytes: (await stat(filename)).size }); } };
try { await collectAssets(dist); } catch {}
const inputAudit = [];
for (const input of lock.inputs) inputAudit.push({ path: input.path, expected: input.sha256, actual: await hashFile(path.join(root, input.path)) });
const compilerAfter = await hashFile(compiler);
const proof = { schemaVersion: "first-pass-joint-build-proof-v1",
  status: exitCode === 0 && !spawnError && transformed.length === 2 && Object.values(assertions).every(Boolean) && assets.length > 0 &&
    inputAudit.every((item) => item.expected === item.actual) && compilerAfter === lock.compiler.sha256 ? "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW" : "BUILD_FAILED_OR_INCOMPLETE",
  exitCode, command: [node, command, "build", "--config", path.join(stage, "vite.config.ts")], nodeVersion: process.version,
  sourceLockSha256: sha(lockBytes), compiler: { ...lock.compiler, sha256After: compilerAfter }, assertions, transformed, assets, inputAudit,
  errors: spawnError ? [spawnError] : [], logs: { stdout: path.relative(root, path.join(proofDir, "vite.stdout.log")), stderr: path.relative(root, path.join(proofDir, "vite.stderr.log")) } };
await writeFile(path.join(proofDir, "build-proof.json"), JSON.stringify(proof, null, 2) + "\n", { flag: "wx" });
if (proof.status !== "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW") process.exitCode = exitCode || 1;
