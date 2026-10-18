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
assert.ok(proofDir.startsWith(path.join(root, "implementation/2026-10-18-joint-async-inputs/benchmark/")));
assert.equal(process.version, "v24.18.0", `Node v24.18.0 required, got ${process.version}`);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (filename) => sha(await readFile(filename));
const walk = async (directory) => {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["target", "node_modules", ".git", "proof-v1"].includes(entry.name)) continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(filename));
    else if (/\.(ts|tsx|mjs|rs|json|yaml)$/.test(entry.name)) output.push(filename);
  }
  return output;
};
const sourcePaths = new Set(["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.r3act-packages.json", "vite.config.ts",
  "deno.json", "deno.lock", "compiler/oxc-spike/Cargo.toml", "compiler/oxc-spike/Cargo.lock",
  "implementation/2026-10-16-publication/verification/deno-runtime.lock"]);
for (const base of ["src", "compiler", "packages", "scripts"]) {
  for (const filename of await walk(path.join(root, base))) sourcePaths.add(path.relative(root, filename).replaceAll(path.sep, "/"));
}
for (const entry of await readdir(stage, { withFileTypes: true })) {
  if (entry.isFile() && /\.(ts|tsx|mjs|html|py|md)$/.test(entry.name)) sourcePaths.add(path.relative(root, path.join(stage, entry.name)).replaceAll(path.sep, "/"));
}
const inputs = [...sourcePaths].sort();
await mkdir(proofDir, { recursive: false });
const lock = { schemaVersion: "joint-async-inputs-source-lock-v1", status: "FROZEN_BEFORE_BUILD", inputs: [],
  compiler: { path: path.relative(root, compiler).replaceAll(path.sep, "/"), sha256: await hashFile(compiler) } };
for (const input of inputs) lock.inputs.push({ path: input, sha256: await hashFile(path.join(root, input)) });
const lockBytes = Buffer.from(JSON.stringify(lock, null, 2) + "\n");
await writeFile(path.join(proofDir, "source-lock.json"), lockBytes, { flag: "wx" });

const vite = path.join(root, "node_modules/vite/bin/vite.js");
const child = spawn(node, [vite, "build", "--config", path.join(stage, "vite.config.ts")], {
  cwd: root, env: { ...process.env, JOINT_ASYNC_INPUTS_PROOF_DIR: proofDir }, detached: true, stdio: ["ignore", "pipe", "pipe"],
});
const stdout = []; const stderr = [];
child.stdout.on("data", (chunk) => stdout.push(chunk)); child.stderr.on("data", (chunk) => stderr.push(chunk));
let spawnError = null;
let stopReason = null;
const stopBuild = (reason) => {
  stopReason ??= reason;
  if (child.pid) { try { process.kill(-child.pid, "SIGKILL"); } catch {} }
};
const interrupted = () => stopBuild("interrupted");
process.once("SIGINT", interrupted);
process.once("SIGTERM", interrupted);
const deadline = setTimeout(() => stopBuild("180000ms build deadline"), 180_000);
const exitCode = await new Promise((resolve) => {
  child.once("error", (error) => { spawnError = String(error); resolve(127); });
  child.once("close", (code) => resolve(code ?? 1));
});
clearTimeout(deadline);
process.off("SIGINT", interrupted);
process.off("SIGTERM", interrupted);
if (child.pid) { try { process.kill(-child.pid, "SIGKILL"); } catch {} }
await writeFile(path.join(proofDir, "vite.stdout.log"), Buffer.concat(stdout), { flag: "wx" });
await writeFile(path.join(proofDir, "vite.stderr.log"), Buffer.concat(stderr), { flag: "wx" });
for (const name of ["native_arm.tsx.js", "react_arm.tsx.js"]) {
  const filename = path.join(proofDir, "transforms", name);
  try { await stat(filename); } catch { /* The proof below records an incomplete capture. */ }
}
const native = await readFile(path.join(proofDir, "transforms/native_arm.tsx.js"), "utf8").catch(() => "");
const reactCode = await readFile(path.join(proofDir, "transforms/react_arm.tsx.js"), "utf8").catch(() => "");
const nativeSource = await readFile(path.join(stage, "native_arm.tsx"), "utf8");
const reactSource = await readFile(path.join(stage, "react_arm.tsx"), "utf8");
const ast = (code) => parse(code, { sourceType: "unambiguous", plugins: ["typescript", "jsx"] }).program;
const transformedAst = ast(native);
const authoredNativeAst = ast(nativeSource);
const authoredReactAst = ast(reactSource);
const property = (node, name) => node?.type === "ObjectExpression"
  ? node.properties.find((item) => item.type === "ObjectProperty" &&
    (item.key.name ?? item.key.value) === name)?.value : null;
const unwrap = (node) => node?.type === "TSAsExpression" ? unwrap(node.expression) : node;
const literal = (node) => node?.type === "StringLiteral" ? node.value
  : node?.type === "NumericLiteral" ? node.value : undefined;
const walkAst = (node, visit) => {
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments", "leadingComments", "trailingComments"].includes(key)) continue;
    if (Array.isArray(value)) value.forEach((item) => walkAst(item, visit));
    else if (value && typeof value === "object") walkAst(value, visit);
  }
};
const functions = (program, name) => {
  const result = [];
  walkAst(program, (node) => { if (node.type === "FunctionDeclaration" && node.id?.name === name) result.push(node); });
  return result;
};
const aliases = { define: new Set(), useAt: new Set(), effectAt: new Set(), collection: new Set() };
walkAst(transformedAst, (node) => {
  if (node.type !== "ImportDeclaration" || !String(node.source.value).includes("native_runtime_api")) return;
  for (const item of node.specifiers) {
    if (item.type !== "ImportSpecifier") continue;
    const imported = item.imported.name ?? item.imported.value;
    if (imported === "defineComponent") aliases.define.add(item.local.name);
    if (imported === "useAt") aliases.useAt.add(item.local.name);
    if (imported === "useEffectAt") aliases.effectAt.add(item.local.name);
    if (imported === "renderCollectionAt") aliases.collection.add(item.local.name);
  }
});
const registrations = [];
const semanticPlans = [];
const revisionInvalidations = [];
walkAst(transformedAst, (node) => {
  if (node.type !== "CallExpression" || node.callee.type !== "Identifier") return;
  if (aliases.define.has(node.callee.name)) registrations.push(node);
  if (node.callee.name === "__registerNativeSemanticPlan") semanticPlans.push(node);
  if (node.callee.name === "__invalidateNativeSemanticPlan") revisionInvalidations.push(node);
});
const semanticPlan = semanticPlans[0]?.arguments[0];
const registeredRevision = literal(property(semanticPlan, "module_revision"));
const registeredSource = literal(property(semanticPlan, "source_file"));
const registration = (name) => registrations.find((call) =>
  literal(call.arguments[0])?.endsWith(`#component:${name}`));
const jointRegistration = registration("Joint");
const jointId = literal(jointRegistration?.arguments[0]);
const jointProgram = property(jointRegistration?.arguments[2], "closedStoreHostProgram");
const jointInputs = property(jointProgram, "inputs")?.elements ?? [];
const jointTree = property(jointProgram, "host");
const props = property(jointTree, "props")?.elements ?? [];
const children = property(jointTree, "children")?.elements ?? [];
const propValue = (entries, name) => entries.find((pair) => literal(pair?.elements?.[0]) === name)?.elements?.[1];
const atInput = (expression, index) => literal(property(expression, "kind")) === "input" && literal(property(expression, "index")) === index;
const binary = (expression, operator) => literal(property(expression, "kind")) === "binary" && literal(property(expression, "operator")) === operator;
const sum = (expression) => binary(expression, "+") && atInput(property(expression, "right"), 3) &&
  binary(property(expression, "left"), "+") && atInput(property(property(expression, "left"), "left"), 2) &&
  atInput(property(property(expression, "left"), "right"), 0);
const paths = (input) => (property(input, "paths")?.elements ?? []).map((node) => (node?.elements ?? []).map(literal));
const text = (host) => {
  const nodes = property(host, "children")?.elements ?? [];
  return nodes.length === 1 && literal(property(nodes[0], "kind")) === "text" ? property(nodes[0], "expression") : null;
};
const style = propValue(props, "style");
const styleEntries = property(style, "entries")?.elements ?? [];
const transform = propValue(styleEntries, "transform"), opacity = propValue(styleEntries, "opacity");
const label = property(children[0], "host"), model = property(children[1], "host");
const calls = [];
walkAst(functions(transformedAst, "Joint")[0]?.body, (node) => {
  if (node.type === "CallExpression" && node.callee.type === "Identifier" && aliases.useAt.has(node.callee.name)) calls.push(node);
});
const fields = ["first", "position", "second"];
const jointProof = literal(property(jointProgram, "schemaVersion")) === 5 &&
  literal(property(jointProgram, "componentProgramId")) === jointId && literal(property(jointProgram, "moduleRevision")) === registeredRevision &&
  jointInputs.length === 3 && calls.length === 3 && fields.every((field, index) =>
    literal(property(jointInputs[index], "storeProp")) === field &&
    literal(property(jointInputs[index], "storeUseSiteId")) === `${jointId}#store:${index}` &&
    literal(calls[index].arguments[0]) === `${jointId}#store:${index}` && calls[index].arguments[1]?.object?.name === "props" &&
    calls[index].arguments[1]?.property?.name === field) &&
  JSON.stringify(jointInputs.map(paths)) === JSON.stringify([[["offset", "x"], ["offset", "y"]], [["position", "x"]], [["offset", "x"], ["offset", "y"]]]) &&
  literal(property(jointTree, "tag")) === "div" && literal(property(jointTree, "key")) === "joint" && props.length === 3 &&
  literal(property(propValue(props, "data-joint"), "value")) === "ready" && sum(propValue(props, "data-value")) &&
  literal(property(style, "kind")) === "style" && styleEntries.length === 2 &&
  literal(property(transform, "kind")) === "template" && sum(property(transform, "expressions")?.elements?.[0]) &&
  JSON.stringify(property(transform, "parts")?.elements?.map(literal)) === JSON.stringify(["translateX(", "px)"]) &&
  binary(opacity, "/") && sum(property(opacity, "left")) && literal(property(property(opacity, "right"), "value")) === 20 &&
  children.length === 2 && literal(property(label, "tag")) === "output" && literal(property(model, "tag")) === "span" &&
  sum(text(label)) && binary(text(model), "+") && atInput(property(text(model), "left"), 1) && atInput(property(text(model), "right"), 4);
const recordLocals = new Set();
walkAst(authoredNativeAst, (node) => {
  if (node.type !== "ImportDeclaration" || !String(node.source.value).includes("native_runtime_api")) return;
  for (const specifier of node.specifiers) if (specifier.type === "ImportSpecifier" && (specifier.imported.name ?? specifier.imported.value) === "storeRecord") recordLocals.add(specifier.local.name);
});
const recordCalls = [];
for (const name of ["payload", "positionState"]) walkAst(authoredNativeAst, (node) => {
  if (node.type !== "VariableDeclarator" || node.id?.name !== name) return;
  walkAst(node.init, (inner) => { if (inner.type === "CallExpression" && recordLocals.has(inner.callee?.name)) recordCalls.push(inner); });
});
const fallbackId = literal(registration("Fallback")?.arguments[0]);
const fallbackLayout = property(registration("Fallback")?.arguments[2], "stateLayout");
const fallbackEffects = [];
walkAst(functions(transformedAst, "Fallback")[0]?.body, (node) => {
  if (node.type === "CallExpression" && node.callee.type === "Identifier" && aliases.effectAt.has(node.callee.name)) fallbackEffects.push(node);
});
const fallbackProof = fallbackId && literal(property(fallbackLayout, "programId")) === fallbackId &&
  literal(property(property(fallbackLayout, "slots")?.elements?.[0], "siteId")) === `${fallbackId}#state:0` &&
  fallbackEffects.length === 1 && literal(fallbackEffects[0].arguments[0]) === `${fallbackId}#effect:0`;
const assertions = {
  nativeJointInputProgram: Boolean(jointProof),
  nativeOwnedPayloads: recordLocals.size === 1 && recordCalls.length === 4,
  nativeFallbackOwnerHookSites: Boolean(fallbackProof),
  nativeRegisteredRevisionAndInvalidation: semanticPlans.length === 1 && /^native-v1-[a-f0-9]+$/.test(registeredRevision ?? "") &&
    revisionInvalidations.length === 1 && literal(revisionInvalidations[0].arguments[0]) === registeredSource &&
    literal(revisionInvalidations[0].arguments[1]) === registeredRevision && jointId?.startsWith(`${registeredSource}#component:`),
  reactCompilerRuntime: /react\/compiler-runtime/.test(reactCode),
  reactMemoCache: /\b_c\(\d+\)/.test(reactCode),
};
const assets = [];
const dist = path.join(proofDir, "dist");
const collect = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(filename);
    else assets.push({ path: path.relative(root, filename).replaceAll(path.sep, "/"),
      urlPath: "/" + path.relative(dist, filename).replaceAll(path.sep, "/"), sha256: await hashFile(filename), bytes: (await stat(filename)).size });
  }
};
try { await collect(dist); } catch {}
const inputAudit = [];
for (const input of lock.inputs) inputAudit.push({ path: input.path, expected: input.sha256, actual: await hashFile(path.join(root, input.path)) });
const compilerAfter = await hashFile(compiler);
const transformed = [];
for (const name of ["native_arm.tsx.js", "react_arm.tsx.js"]) {
  const filename = path.join(proofDir, "transforms", name);
  try { transformed.push({ path: path.relative(root, filename).replaceAll(path.sep, "/"), sha256: await hashFile(filename), bytes: (await stat(filename)).size }); }
  catch {}
}
const proof = { schemaVersion: "joint-async-inputs-build-proof-v1",
  status: exitCode === 0 && !spawnError && !stopReason && transformed.length === 2 && Object.values(assertions).every(Boolean) && assets.length > 0 &&
    inputAudit.every((item) => item.expected === item.actual) && compilerAfter === lock.compiler.sha256
    ? "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW" : "BUILD_FAILED_OR_INCOMPLETE",
  exitCode, stopReason, nodeVersion: process.version, command: [node, vite, "build", "--config", path.join(stage, "vite.config.ts")],
  sourceLockSha256: sha(lockBytes), compiler: { ...lock.compiler, sha256After: compilerAfter }, assertions,
  jointProgram: { id: jointId, inputs: jointInputs.length, revision: registeredRevision }, transformed, assets, inputAudit, errors: spawnError ? [spawnError] : [],
  logs: { stdout: "vite.stdout.log", stderr: "vite.stderr.log" } };
await writeFile(path.join(proofDir, "build-proof.json"), JSON.stringify(proof, null, 2) + "\n", { flag: "wx" });
if (proof.status !== "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW") process.exitCode = exitCode || 1;
