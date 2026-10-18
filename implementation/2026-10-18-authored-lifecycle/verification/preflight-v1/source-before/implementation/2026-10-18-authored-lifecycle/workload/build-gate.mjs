import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const root = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const stage = path.dirname(fileURLToPath(import.meta.url));
const node = "/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node";
const compiler = path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const flag = process.argv.indexOf("--proof-dir");
assert.ok(flag >= 0 && process.argv[flag + 1], "usage: node build-gate.mjs --proof-dir ABSOLUTE_NEW_DIR");
const proofDir = path.resolve(process.argv[flag + 1]);
assert.equal(proofDir, path.join(stage, "proof-v1"), "one exclusive proof-v1 destination");
assert.equal(process.version, "v24.18.0");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (filename) => sha(await readFile(filename));
async function walk(directory, names) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["target", "node_modules", ".git", "proof-v1", "verification"].includes(entry.name)) continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(filename, names);
    else if (/\.(ts|tsx|mjs|rs|json|yaml)$/.test(entry.name)) names.add(path.relative(root, filename).replaceAll(path.sep, "/"));
  }
}
const names = new Set(["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.r3act-packages.json", "vite.config.ts", "deno.json", "deno.lock", "compiler/oxc-spike/Cargo.toml", "compiler/oxc-spike/Cargo.lock", "implementation/2026-10-16-publication/verification/deno-runtime.lock"]);
for (const directory of ["src", "compiler", "packages", "scripts"]) await walk(path.join(root, directory), names);
for (const entry of await readdir(stage, { withFileTypes: true })) {
  if (entry.isFile() && /\.(ts|tsx|mjs|html|md)$/.test(entry.name)) names.add(path.relative(root, path.join(stage, entry.name)).replaceAll(path.sep, "/"));
}
const inputs = [...names].sort();
await mkdir(proofDir, { recursive: false });
const lock = { schemaVersion: "authored-lifecycle-source-lock-v1", status: "FROZEN_BEFORE_BUILD", inputs: [],
  compiler: { path: path.relative(root, compiler).replaceAll(path.sep, "/"), sha256: await hashFile(compiler) } };
for (const input of inputs) lock.inputs.push({ path: input, sha256: await hashFile(path.join(root, input)) });
const lockBytes = Buffer.from(JSON.stringify(lock, null, 2) + "\n");
await writeFile(path.join(proofDir, "source-lock.json"), lockBytes, { flag: "wx" });
const vite = path.join(root, "node_modules/vite/bin/vite.js");
const child = spawn(node, [vite, "build", "--config", path.join(stage, "vite.config.ts")], {
  cwd: root, env: { ...process.env, AUTHORED_LIFECYCLE_PROOF_DIR: proofDir },
  detached: true, stdio: ["ignore", "pipe", "pipe"],
});
const stdout = [], stderr = [];
child.stdout.on("data", (chunk) => stdout.push(chunk));
child.stderr.on("data", (chunk) => stderr.push(chunk));
let spawnError = null, stopReason = null;
const stop = (reason) => { stopReason ??= reason; if (child.pid) { try { process.kill(-child.pid, "SIGKILL"); } catch {} } };
const interrupted = () => stop("interrupted");
process.once("SIGINT", interrupted); process.once("SIGTERM", interrupted);
const timer = setTimeout(() => stop("180000ms deadline"), 180_000);
const exitCode = await new Promise((resolve) => {
  child.once("error", (error) => { spawnError = String(error); resolve(127); });
  child.once("close", (code) => resolve(code ?? 1));
});
clearTimeout(timer); process.off("SIGINT", interrupted); process.off("SIGTERM", interrupted);
if (child.pid) { try { process.kill(-child.pid, "SIGKILL"); } catch {} }
await writeFile(path.join(proofDir, "vite.stdout.log"), Buffer.concat(stdout), { flag: "wx" });
await writeFile(path.join(proofDir, "vite.stderr.log"), Buffer.concat(stderr), { flag: "wx" });
const nativeSource = await readFile(path.join(stage, "native_arm.tsx"), "utf8");
const reactSource = await readFile(path.join(stage, "react_arm.tsx"), "utf8");
const nativeCode = await readFile(path.join(proofDir, "transforms/native_arm.tsx.js"), "utf8").catch(() => "");
const reactCode = await readFile(path.join(proofDir, "transforms/react_arm.tsx.js"), "utf8").catch(() => "");
const parseAst = (code) => parse(code, { sourceType: "unambiguous", plugins: ["typescript", "jsx"] }).program;
const traverse = (node, visit) => {
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments", "leadingComments", "trailingComments"].includes(key)) continue;
    if (Array.isArray(value)) value.forEach((part) => traverse(part, visit));
    else if (value && typeof value === "object") traverse(value, visit);
  }
};
const calls = (program) => {
  const result = [];
  traverse(program, (node) => { if (node.type === "CallExpression") result.push(node); });
  return result;
};
const imports = (program) => program.body.filter((node) => node.type === "ImportDeclaration");
const sourceAst = parseAst(nativeSource), transformedAst = nativeCode ? parseAst(nativeCode) : null;
const reactAst = parseAst(reactSource);
const packageImport = imports(sourceAst).find((node) => node.source.value === "@r3act/core");
const nativeAliases = new Map();
for (const node of imports(transformedAst ?? { body: [] })) {
  if (!(String(node.source.value).includes("native_runtime_api") || node.source.value === "@r3act/core")) continue;
  for (const item of node.specifiers) if (item.type === "ImportSpecifier") nativeAliases.set(item.local.name, item.imported.name ?? item.imported.value);
}
const nativeCalls = transformedAst ? calls(transformedAst) : [];
const hookSites = {};
for (const [label, imported] of [["useAt", "useAt"], ["stateAt", "useStateAt"], ["effectAt", "useEffectAt"]]) {
  hookSites[label] = nativeCalls.filter((call) => call.callee.type === "Identifier" && nativeAliases.get(call.callee.name) === imported)
    .map((call) => call.arguments[0]?.value).filter((site) => typeof site === "string");
}
const authoredCalls = calls(sourceAst);
const reactCalls = calls(reactAst);
const sourceFunctions = [];
traverse(sourceAst, (node) => { if (node.type === "FunctionDeclaration") sourceFunctions.push(node.id?.name); });
const transformedFunctions = [];
traverse(transformedAst, (node) => { if (node.type === "FunctionDeclaration") transformedFunctions.push(node.id?.name); });
const nativeRegistration = nativeCalls.filter((call) => nativeAliases.get(call.callee.name) === "defineComponent");
const nativePlans = nativeCalls.filter((call) => call.callee.name === "__registerNativeSemanticPlan");
const nativeInvalidations = nativeCalls.filter((call) => call.callee.name === "__invalidateNativeSemanticPlan");
const field = (node, name) => node?.type === "ObjectExpression"
  ? node.properties.find((entry) => entry.type === "ObjectProperty" && (entry.key.name ?? entry.key.value) === name)?.value : null;
const plan = nativePlans[0]?.arguments[0];
const revision = field(plan, "module_revision")?.value;
const sourceFile = field(plan, "source_file")?.value;
const registeredIds = nativeRegistration.map((call) => call.arguments[0]?.value);
const expectedComponents = ["Row", "Rows", "Detail", "Health", "DetailFallback", "HealthFallback", "App"];
const expectedHooks = {
  useAt: ["Row#store:0", "Rows#store:0", "Detail#store:0", "Health#store:0"],
  stateAt: ["Row#state:0"],
  effectAt: ["Row#effect:0", "DetailFallback#effect:0", "HealthFallback#effect:0"],
};
const exactHooks = Object.entries(expectedHooks).every(([kind, sites]) =>
  JSON.stringify([...hookSites[kind]].sort()) === JSON.stringify(sites.map((site) => `${sourceFile}#component:${site}`).sort()));
const assertions = {
  publicCoreImport: Boolean(packageImport) && !imports(sourceAst).some((node) => String(node.source.value).includes("native_runtime_api")),
  nativeCompilerRegistration: nativeRegistration.length === 7 && nativePlans.length === 1 && nativeInvalidations.length === 1 &&
    typeof sourceFile === "string" && sourceFile === path.relative(root, path.join(stage, "native_arm.tsx")).replaceAll(path.sep, "/") &&
    /^native-v1-[a-f0-9]+$/.test(revision ?? "") && nativeInvalidations[0].arguments[0]?.value === sourceFile &&
    nativeInvalidations[0].arguments[1]?.value === revision && expectedComponents.every((name) => registeredIds.includes(`${sourceFile}#component:${name}`)),
  nativeHookSites: exactHooks &&
    Object.values(hookSites).flat().every((site) => /#(store|state|effect):\d+$/.test(site)),
  nativeGenericArrayMap: authoredCalls.some((call) => call.callee.type === "MemberExpression" && call.callee.property?.name === "map") &&
    nativeCalls.some((call) => call.callee.type === "MemberExpression" && call.callee.property?.name === "map"),
  nativeNamedComponents: sourceFunctions.includes("Row") && transformedFunctions.includes("Row"),
  reactCompilerRuntime: /react\/compiler-runtime/.test(reactCode),
  reactMemoCache: /\b_c\(\d+\)/.test(reactCode),
  reactAuthoredHooks: reactCalls.some((call) => call.callee.name === "useSyncExternalStore") &&
    reactCalls.some((call) => call.callee.name === "useLayoutEffect"),
};
const assets = [], transformed = [];
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(filename);
    else assets.push({ path: path.relative(root, filename).replaceAll(path.sep, "/"),
      urlPath: "/" + path.relative(path.join(proofDir, "dist"), filename).replaceAll(path.sep, "/"),
      sha256: await hashFile(filename), bytes: (await stat(filename)).size });
  }
}
try { await collect(path.join(proofDir, "dist")); } catch {}
for (const name of ["native_arm.tsx.js", "react_arm.tsx.js"]) {
  const filename = path.join(proofDir, "transforms", name);
  try { transformed.push({ path: path.relative(root, filename).replaceAll(path.sep, "/"), sha256: await hashFile(filename), bytes: (await stat(filename)).size }); } catch {}
}
const inputAudit = [];
for (const input of lock.inputs) inputAudit.push({ path: input.path, expected: input.sha256, actual: await hashFile(path.join(root, input.path)) });
const compilerAfter = await hashFile(compiler);
const proof = { schemaVersion: "authored-lifecycle-build-proof-v1",
  status: exitCode === 0 && !spawnError && !stopReason && transformed.length === 2 && assets.length > 0 &&
    Object.values(assertions).every(Boolean) && inputAudit.every((item) => item.expected === item.actual) &&
    compilerAfter === lock.compiler.sha256 ? "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW" : "BUILD_FAILED_OR_INCOMPLETE",
  exitCode, spawnError, stopReason, command: [node, vite, "build", "--config", path.join(stage, "vite.config.ts")],
  nodeVersion: process.version, compiler: { ...lock.compiler, afterSha256: compilerAfter },
  sourceLockSha256: sha(lockBytes), inputAudit, assertions, provenance: { publicImport: packageImport?.source.value ?? null,
    viteAliases: ["@r3act/core", "@r3act/core/jsx-runtime", "@r3act/core/jsx-dev-runtime"], hookSites,
    nativeRegistrationCount: nativeRegistration.length, nativePlanCount: nativePlans.length,
    nativeInvalidationCount: nativeInvalidations.length, reactCompilerRuntime: assertions.reactCompilerRuntime },
  transformed, assets };
await writeFile(path.join(proofDir, "build-proof.json"), JSON.stringify(proof, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ status: proof.status, proofDir, assertions }));
if (proof.status !== "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW") process.exitCode = 1;
