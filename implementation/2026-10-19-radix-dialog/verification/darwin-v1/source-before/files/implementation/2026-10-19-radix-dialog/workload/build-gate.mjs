import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { copyFile, mkdir, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const root = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const stage = path.dirname(fileURLToPath(import.meta.url));
const node = process.execPath;
const compiler = path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const index = process.argv.indexOf("--proof-dir");
assert.ok(index >= 0 && process.argv[index + 1], "usage: node build-gate.mjs --proof-dir ABSOLUTE_NEW_DIR");
const proofDir = path.resolve(process.argv[index + 1]);
assert.ok(proofDir.startsWith(`${stage}${path.sep}`));
assert.equal(process.version, "v24.18.0");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (filename) => sha(await readFile(filename));
const walk = async (directory) => {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["target", "node_modules", ".git", "dist"].includes(entry.name) || entry.name.startsWith("proof-")) continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(filename));
    else if (/\.(ts|tsx|mjs|rs|json|yaml)$/.test(entry.name)) result.push(filename);
  }
  return result;
};
const sourcePaths = new Set(["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml",
  "tsconfig.r3act-packages.json", "vite.config.ts", "deno.json", "deno.lock",
  "compiler/oxc-spike/Cargo.toml", "compiler/oxc-spike/Cargo.lock"]);
for (const base of ["src", "compiler", "packages", "scripts", "implementation/2026-10-19-radix-dialog/workload"])
  for (const filename of await walk(path.join(root, base)))
    sourcePaths.add(path.relative(root, filename).replaceAll(path.sep, "/"));
sourcePaths.add(path.relative(root, path.join(stage, "index.html")).replaceAll(path.sep, "/"));
const require = createRequire(import.meta.url);
const runtimePackages = [];
const seenPackages = new Set();
const runtimeFiles = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const filename = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`runtime package symlink is not supported: ${filename}`);
    if (entry.isDirectory()) files.push(...await runtimeFiles(filename));
    else if (entry.isFile()) files.push(filename);
    else throw new Error(`unsupported runtime package entry: ${filename}`);
  }
  return files;
};
async function pinPackage(name, from = root) {
  const resolved = require.resolve(name, { paths: [from] });
  let directory = path.dirname(resolved);
  while (true) {
    try { await stat(path.join(directory, "package.json")); break; }
    catch { const parent = path.dirname(directory); if (parent === directory) throw new Error(`package root missing: ${name}`);
      directory = parent; }
  }
  directory = await realpath(directory);
  assert.ok(directory.startsWith(`${path.join(root, "node_modules")}${path.sep}`),
    `runtime package escaped repository node_modules: ${directory}`);
  if (seenPackages.has(directory)) return;
  seenPackages.add(directory);
  const manifest = JSON.parse(await readFile(path.join(directory, "package.json"), "utf8"));
  if (manifest.name !== name) throw new Error(`resolved wrong package for ${name}: ${manifest.name}`);
  runtimePackages.push({ name, version: manifest.version, path: path.relative(root, directory).replaceAll(path.sep, "/") });
  for (const filename of await runtimeFiles(directory)) sourcePaths.add(path.relative(root, filename).replaceAll(path.sep, "/"));
  for (const dependency of Object.keys(manifest.dependencies ?? {}).sort()) await pinPackage(dependency, directory);
}
for (const name of ["@radix-ui/react-dialog", "react", "react-dom"]) await pinPackage(name);
await mkdir(proofDir, { recursive: false });
const lock = { schemaVersion: "radix-dialog-source-lock-v1", status: "FROZEN_BEFORE_BUILD",
  compiler: { path: path.relative(root, compiler).replaceAll(path.sep, "/"), sha256: await hashFile(compiler) },
  runtimePackages: runtimePackages.sort((a, b) => a.name.localeCompare(b.name)), inputs: [] };
for (const input of [...sourcePaths].sort()) lock.inputs.push({ path: input, sha256: await hashFile(path.join(root, input)) });
const lockBytes = Buffer.from(JSON.stringify(lock, null, 2) + "\n");
await writeFile(path.join(proofDir, "source-lock.json"), lockBytes, { flag: "wx" });
const archiveRoot = path.join(proofDir, "source-inputs/files");
for (const input of lock.inputs) {
  assert.ok(!path.isAbsolute(input.path) && !input.path.split("/").includes(".."),
    `source archive path escaped repository: ${input.path}`);
  const copy = path.join(archiveRoot, input.path);
  await mkdir(path.dirname(copy), { recursive: true });
  await copyFile(path.join(root, input.path), copy, constants.COPYFILE_EXCL);
  assert.equal(await hashFile(copy), input.sha256, `source archive mismatch: ${input.path}`);
}
const vite = path.join(root, "node_modules/vite/bin/vite.js");
const child = spawn(node, [vite, "build", "--config", path.join(stage, "vite.config.ts")], {
  cwd: root, env: { ...process.env, RADIX_DIALOG_PROOF_DIR: proofDir },
  detached: true, stdio: ["ignore", "pipe", "pipe"],
});
const stdout = [], stderr = [];
child.stdout.on("data", (chunk) => stdout.push(chunk));
child.stderr.on("data", (chunk) => stderr.push(chunk));
let spawnError = null, stopReason = null;
const stop = (reason) => {
  stopReason ??= reason;
  if (child.pid) { try { process.kill(-child.pid, "SIGKILL"); } catch {} }
};
const interrupted = () => stop("interrupted");
process.once("SIGINT", interrupted); process.once("SIGTERM", interrupted);
const deadline = setTimeout(() => stop("180000ms build deadline"), 180_000);
const exitCode = await new Promise((resolve) => {
  child.once("error", (error) => { spawnError = String(error); resolve(127); });
  child.once("close", (code) => resolve(code ?? 1));
});
clearTimeout(deadline); process.off("SIGINT", interrupted); process.off("SIGTERM", interrupted);
if (child.pid) { try { process.kill(-child.pid, "SIGKILL"); } catch {} }
await writeFile(path.join(proofDir, "vite.stdout.log"), Buffer.concat(stdout), { flag: "wx" });
await writeFile(path.join(proofDir, "vite.stderr.log"), Buffer.concat(stderr), { flag: "wx" });
const native = await readFile(path.join(proofDir, "transforms/native-radix-dialog.tsx.js"), "utf8").catch(() => "");
const nativeBootstrap = await readFile(path.join(proofDir, "transforms/native_arm.tsx.js"), "utf8").catch(() => "");
const reactCode = await readFile(path.join(proofDir, "transforms/dialog_body.tsx.js"), "utf8").catch(() => "");
const radixCode = await readFile(path.join(proofDir, "transforms/react_radix_dialog_adapter.ts.js"), "utf8").catch(() => "");
const ast = (code) => parse(code, { sourceType: "unambiguous", plugins: ["typescript", "jsx"] }).program;
const property = (node, name) => node?.type === "ObjectExpression" ? node.properties.find((entry) =>
  entry.type === "ObjectProperty" && (entry.key.name ?? entry.key.value) === name)?.value : null;
const literal = (node) => node?.type === "StringLiteral" ? node.value : node?.type === "NumericLiteral" ? node.value : null;
const visit = (node, callback) => {
  if (!node || typeof node !== "object") return;
  callback(node);
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
    if (Array.isArray(value)) value.forEach((item) => visit(item, callback));
    else if (value && typeof value === "object") visit(value, callback);
  }
};
const authoredNative = await readFile(path.join(root, "compiler/fixtures/native-radix-dialog.tsx"), "utf8");
const assertions = { publicCoreImport: authoredNative.includes('from "@r3act/core"'),
  publicBridgeImport: authoredNative.includes('from "@r3act/react-bridge/radix-dialog"'),
  nativeAppRegistered: false, pendingGateRegistered: false, nativeBootstrapRegistered: false,
  nativeDialogOpaque: false, nativeOpenStoreReadLowered: false, nativePointStoreReadLowered: false,
  nativeStateLowered: false, radixComponentRetained: false,
  reactCompilerRuntime: reactCode.includes("react/compiler-runtime"),
  reactHotBodyMemo: false, reactRadixSourceTransformed: false };
if (native) {
  const program = ast(native), definitions = [];
  const aliases = new Map();
  for (const statement of program.body) if (statement.type === "ImportDeclaration")
    for (const specifier of statement.specifiers) if (specifier.type === "ImportSpecifier")
      aliases.set(specifier.imported.name ?? specifier.imported.value, specifier.local.name);
  visit(program, (node) => { if (node.type === "CallExpression" && node.callee.name === aliases.get("defineComponent")) definitions.push(node); });
  const definition = definitions.find((call) =>
    literal(call.arguments[0])?.endsWith("#component:NativeRadixApp"));
  assertions.nativeAppRegistered = Boolean(definition);
  assertions.pendingGateRegistered = definitions.some(call =>
    literal(call.arguments[0])?.endsWith("#component:PendingGate"));
  const metadata = definition?.arguments[2];
  const propSites = property(metadata, "propOnlySites");
  assertions.nativeDialogOpaque = propSites?.type === "ArrayExpression" && propSites.elements.length === 0 &&
    !property(metadata, "closedStoreHostProgram") && !property(metadata, "closedResourceHostProgram") &&
    !property(metadata, "closedComponentForwardProgram");
  const app = program.body.map(node => node.type === "ExportNamedDeclaration" ? node.declaration : node)
    .find(node => node?.type === "FunctionDeclaration" && node.id?.name === "NativeRadixApp");
  const appCalls = [];
  visit(app?.body, node => { if (node.type === "CallExpression") appCalls.push(node); });
  const lowered = (helper, suffix) => typeof aliases.get(helper) === "string" && appCalls.some(call =>
    call.callee.name === aliases.get(helper) &&
    literal(call.arguments[0])?.endsWith(`#component:NativeRadixApp#${suffix}`));
  assertions.nativeOpenStoreReadLowered = lowered("useAt", "store:0") && native.includes("props.openStore");
  assertions.nativePointStoreReadLowered = lowered("useAt", "store:1") && native.includes("props.pointStore");
  assertions.nativeStateLowered = lowered("useStateAt", "state:0") && native.includes("data-native-count");
  const calls = [];
  visit(program, node => { if (node.type === "CallExpression") calls.push(node.callee.name ?? ""); });
  assertions.radixComponentRetained = native.includes("RadixDialog") && native.includes("DialogBody") &&
    native.includes("portalContainer") && calls.includes("createElement");
}
if (nativeBootstrap) {
  const bootstrap = ast(nativeBootstrap);
  const registrations = [];
  visit(bootstrap, node => { if (node.type === "CallExpression" && /DefineComponent$/.test(node.callee.name ?? "")) registrations.push(node); });
  assertions.nativeBootstrapRegistered = registrations.some(call =>
    literal(call.arguments[0])?.endsWith("#component:NativeRootView"));
}
if (reactCode) {
  const program = ast(reactCode);
  const functions = [];
  visit(program, (node) => { if (node.type === "FunctionDeclaration" && node.id?.name === "DialogBody") functions.push(node); });
  assertions.reactHotBodyMemo = functions.length === 1 && functions.every((fn) => {
    let memo = false;
    visit(fn.body, (node) => { if (node.type === "CallExpression" && node.callee.name === "_c" &&
      node.arguments[0]?.type === "NumericLiteral") memo = true; });
    return memo;
  });
}
if (radixCode) {
  const program = ast(radixCode), functions = [];
  visit(program, node => { if (node.type === "FunctionDeclaration" && node.id?.name === "ReactRadixDialog") functions.push(node); });
  assertions.reactRadixSourceTransformed = functions.length === 1 && radixCode.includes("react/compiler-runtime") &&
    functions.some(fn => { let memo = false;
      visit(fn.body, node => { if (node.type === "CallExpression" && node.callee.name === "_c") memo = true; });
      return memo; });
}
const assets = [];
const dist = path.join(proofDir, "dist");
const collect = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(filename);
    else assets.push({ path: path.relative(root, filename).replaceAll(path.sep, "/"),
      urlPath: "/" + path.relative(dist, filename).replaceAll(path.sep, "/"),
      sha256: await hashFile(filename), bytes: (await stat(filename)).size });
  }
};
try { await collect(dist); } catch {}
const transformed = [];
for (const name of ["native-radix-dialog.tsx.js", "native_arm.tsx.js", "dialog_body.tsx.js",
  "react_arm.tsx.js", "react_radix_dialog_adapter.ts.js", "../react-compiler-events.json"]) {
  const filename = path.join(proofDir, "transforms", name);
  try { transformed.push({ path: path.relative(root, filename).replaceAll(path.sep, "/"),
    sha256: await hashFile(filename), bytes: (await stat(filename)).size }); } catch {}
}
const inputAudit = [];
for (const input of lock.inputs) inputAudit.push({ path: input.path, expected: input.sha256,
  actual: await hashFile(path.join(root, input.path)),
  archived: await hashFile(path.join(archiveRoot, input.path)) });
const compilerAfter = await hashFile(compiler);
const proof = { schemaVersion: "radix-dialog-build-proof-v1",
  status: exitCode === 0 && !spawnError && !stopReason && transformed.length === 6 && assets.length > 0 &&
    Object.values(assertions).every(Boolean) && inputAudit.every((row) =>
      row.expected === row.actual && row.expected === row.archived) &&
    compilerAfter === lock.compiler.sha256 ? "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW" : "BUILD_FAILED_OR_INCOMPLETE",
  exitCode, stopReason, nodeVersion: process.version,
  command: [node, vite, "build", "--config", path.join(stage, "vite.config.ts")],
  sourceLockSha256: sha(lockBytes), sourceArchive: path.relative(root, archiveRoot).replaceAll(path.sep, "/"),
  compiler: { ...lock.compiler, sha256After: compilerAfter },
  assertions, transformed, assets, inputAudit, errors: spawnError ? [spawnError] : [],
  logs: { stdout: "vite.stdout.log", stderr: "vite.stderr.log" } };
await writeFile(path.join(proofDir, "build-proof.json"), JSON.stringify(proof, null, 2) + "\n", { flag: "wx" });
if (proof.status !== "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW") process.exitCode = exitCode || 1;
