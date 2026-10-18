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
assert.ok(proofDir.startsWith(path.join(root, "implementation/2026-10-18-store-values/benchmark/")));
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
const lock = { schemaVersion: "store-values-source-lock-v1", status: "FROZEN_BEFORE_BUILD", inputs: [],
  compiler: { path: path.relative(root, compiler).replaceAll(path.sep, "/"), sha256: await hashFile(compiler) } };
for (const input of inputs) lock.inputs.push({ path: input, sha256: await hashFile(path.join(root, input)) });
const lockBytes = Buffer.from(JSON.stringify(lock, null, 2) + "\n");
await writeFile(path.join(proofDir, "source-lock.json"), lockBytes, { flag: "wx" });

const vite = path.join(root, "node_modules/vite/bin/vite.js");
const child = spawn(node, [vite, "build", "--config", path.join(stage, "vite.config.ts")], {
  cwd: root, env: { ...process.env, STORE_VALUES_PROOF_DIR: proofDir }, detached: true, stdio: ["ignore", "pipe", "pipe"],
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
const aliases = { define: new Set(), useAt: new Set(), collection: new Set() };
walkAst(transformedAst, (node) => {
  if (node.type !== "ImportDeclaration" || !String(node.source.value).includes("native_runtime_api")) return;
  for (const item of node.specifiers) {
    if (item.type !== "ImportSpecifier") continue;
    const imported = item.imported.name ?? item.imported.value;
    if (imported === "defineComponent") aliases.define.add(item.local.name);
    if (imported === "useAt") aliases.useAt.add(item.local.name);
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
const jointMetadata = jointRegistration?.arguments[2];
const jointProgram = property(jointMetadata, "closedStoreHostProgram");
const jointHost = property(jointProgram, "host");
const jointInputs = unwrap(property(jointProgram, "inputs"))?.elements ?? [];
const jointProps = unwrap(property(jointHost, "props"))?.elements ?? [];
const jointExpression = jointProps[0]?.elements?.[1];
const jointUseCalls = [];
walkAst(functions(transformedAst, "Joint")[0]?.body, (node) => {
  if (node.type === "CallExpression" && node.callee.type === "Identifier" &&
    aliases.useAt.has(node.callee.name)) jointUseCalls.push(node);
});
const jointProof = jointId && literal(property(jointProgram, "schemaVersion")) === 3 &&
  literal(property(jointProgram, "componentProgramId")) === jointId &&
  literal(property(jointProgram, "moduleRevision")) === registeredRevision &&
  literal(property(jointHost, "tag")) === "output" && literal(property(jointHost, "key")) === "joint" &&
  property(jointHost, "child")?.type === "NullLiteral" && jointInputs.length === 2 &&
  ["position", "camera"].every((name, index) =>
    literal(property(jointInputs[index], "storeProp")) === name &&
    literal(property(jointInputs[index], "storeUseSiteId")) === `${jointId}#store:${index}` &&
    literal(jointUseCalls[index]?.arguments[0]) === `${jointId}#store:${index}` &&
    jointUseCalls[index]?.arguments[1]?.type === "MemberExpression" &&
    jointUseCalls[index].arguments[1].object?.name === "props" &&
    jointUseCalls[index].arguments[1].property?.name === name) &&
  jointUseCalls.length === 2 && jointProps.length === 2 &&
  literal(jointProps[0]?.elements?.[0]) === "data-joint" &&
  literal(property(jointExpression, "kind")) === "binary" &&
  literal(property(jointExpression, "operator")) === "+" &&
  literal(property(property(jointExpression, "left"), "index")) === 0 &&
  literal(property(property(jointExpression, "right"), "index")) === 1;
const styleEntry = (props, name) => props.find((pair) => literal(pair?.elements?.[0]) === name)?.elements?.[1];
const jointStyle = styleEntry(jointProps, "style");
const jointStyleEntries = property(jointStyle, "entries")?.elements ?? [];
const opacity = jointStyleEntries[0]?.elements?.[1];
const jointStyleProof = literal(property(jointStyle, "kind")) === "style" && jointStyleEntries.length === 1 &&
  literal(jointStyleEntries[0]?.elements?.[0]) === "opacity" &&
  literal(property(opacity, "kind")) === "binary" && literal(property(opacity, "operator")) === "/" &&
  literal(property(property(opacity, "right"), "value")) === 10 &&
  literal(property(property(opacity, "left"), "kind")) === "binary" &&
  literal(property(property(opacity, "left"), "operator")) === "+" &&
  literal(property(property(property(opacity, "left"), "left"), "index")) === 0 &&
  literal(property(property(property(opacity, "left"), "right"), "index")) === 1;
const positionRegistration = registration("Position");
const positionId = literal(positionRegistration?.arguments[0]);
const positionProgram = property(positionRegistration?.arguments[2], "closedStoreHostProgram");
const positionHost = property(positionProgram, "host");
const positionProps = property(positionHost, "props")?.elements ?? [];
const positionInputs = property(positionProgram, "inputs")?.elements ?? [];
const positionStyle = styleEntry(positionProps, "style");
const positionEntries = property(positionStyle, "entries")?.elements ?? [];
const transform = positionEntries[0]?.elements?.[1];
const transformParts = property(transform, "parts")?.elements ?? [];
const transformInputs = property(transform, "expressions")?.elements ?? [];
const positionUseCalls = [];
walkAst(functions(transformedAst, "Position")[0]?.body, (node) => {
  if (node.type === "CallExpression" && node.callee.type === "Identifier" && aliases.useAt.has(node.callee.name)) positionUseCalls.push(node);
});
const positionProof = positionId && literal(property(positionProgram, "schemaVersion")) === 3 &&
  literal(property(positionProgram, "componentProgramId")) === positionId &&
  literal(property(positionProgram, "moduleRevision")) === registeredRevision &&
  literal(property(positionHost, "tag")) === "div" && literal(property(positionHost, "key")) === "position" &&
  property(positionHost, "child")?.type === "NullLiteral" && positionInputs.length === 1 &&
  literal(property(positionInputs[0], "storeProp")) === "position" &&
  literal(property(positionInputs[0], "storeUseSiteId")) === `${positionId}#store:0` &&
  positionUseCalls.length === 1 && literal(positionUseCalls[0].arguments[0]) === `${positionId}#store:0` &&
  positionUseCalls[0].arguments[1]?.object?.name === "props" && positionUseCalls[0].arguments[1]?.property?.name === "position" &&
  positionProps.length === 2 && literal(property(positionStyle, "kind")) === "style" &&
  positionEntries.length === 1 && literal(positionEntries[0]?.elements?.[0]) === "transform" &&
  literal(property(transform, "kind")) === "template" && transformParts.length === 2 &&
  literal(transformParts[0]) === "translateX(" && literal(transformParts[1]) === "px)" &&
  transformInputs.length === 1 && literal(property(transformInputs[0], "kind")) === "input" &&
  literal(property(transformInputs[0], "index")) === 0;
const worldRegistration = registration("World");
const worldId = literal(worldRegistration?.arguments[0]);
const worldMetadata = worldRegistration?.arguments[2];
const layout = property(worldMetadata, "stateLayout");
const worldSite = literal(property(property(layout, "slots")?.elements?.[0], "siteId"));
const worldLayoutProof = worldId && literal(property(layout, "programId")) === worldId &&
  literal(property(layout, "moduleRevision")) === registeredRevision &&
  worldSite === `${worldId}#state:0` &&
  property(layout, "slots")?.elements?.length === 1 &&
  property(worldMetadata, "propOnlySites")?.elements?.length === 1 &&
  literal(property(worldMetadata, "propOnlySites").elements[0]) === worldSite;
const closedNumeric = [];
walkAst(transformedAst, (node) => {
  if (node.type === "ObjectExpression" &&
    literal(property(node, "ownerProgramId")) === worldId &&
    property(node, "closedExpression")) closedNumeric.push(node);
});
const worldClosedProof = closedNumeric.some((node) =>
  property(node, "sourceSites")?.elements?.length === 1 &&
  literal(property(node, "sourceSites").elements[0]) === worldSite &&
  literal(property(property(node, "closedExpression"), "kind")) === "input" &&
  literal(property(property(node, "closedExpression"), "index")) === 0);
const authoredJoint = functions(authoredNativeAst, "Joint")[0];
const authoredReactJoint = functions(authoredReactAst, "Joint")[0];
const directNativeUses = [];
walkAst(authoredJoint?.body, (node) => {
  if (node.type === "CallExpression" && node.callee?.name === "use") directNativeUses.push(node);
});
const directReactUses = [];
walkAst(authoredReactJoint?.body, (node) => {
  if (node.type === "CallExpression" && node.callee?.name === "useSyncExternalStore") directReactUses.push(node);
});
const authoredDirectProof = ["position", "camera"].every((name, index) =>
  directNativeUses[index]?.arguments[0]?.type === "MemberExpression" &&
  directNativeUses[index].arguments[0].object?.name === "props" &&
  directNativeUses[index].arguments[0].property?.name === name &&
  directReactUses[index]?.arguments[0]?.property?.name === "subscribe" &&
  directReactUses[index]?.arguments[0]?.object?.property?.name === name &&
  directReactUses[index]?.arguments[1]?.property?.name === "getSnapshot" &&
  directReactUses[index]?.arguments[1]?.object?.property?.name === name) &&
  directNativeUses.length === 2 && directReactUses.length === 2;
const keyedCalls = [];
walkAst(transformedAst, (node) => {
  if (node.type === "CallExpression" && node.callee.type === "Identifier" &&
    (aliases.collection.has(node.callee.name) || node.callee.name === "renderCollectionAt")) keyedCalls.push(node);
});
const queueCalls = [];
walkAst(authoredNativeAst, (node) => {
  if (node.type === "CallExpression" && node.callee?.property?.name === "enqueueTransaction") queueCalls.push(node);
});
const assertions = {
  nativeJointClosedStoreHost: Boolean(jointProof && jointStyleProof),
  nativeStructuredPositionStore: Boolean(positionProof),
  nativeWorldStateLayout: Boolean(worldLayoutProof && worldClosedProof),
  nativeKeyedCollectionLowering: keyedCalls.some((call) => literal(call.arguments[0]) === "store-values-benchmark-rows"),
  nativeDeclaredQueueTransaction: queueCalls.length === 1 &&
    property(queueCalls[0].arguments[0], "roots")?.elements?.length === 1,
  nativeRegisteredRevisionAndInvalidation: semanticPlans.length === 1 &&
    /^native-v1-[a-f0-9]+$/.test(registeredRevision ?? "") &&
    revisionInvalidations.length === 1 &&
    literal(revisionInvalidations[0].arguments[0]) === registeredSource &&
    literal(revisionInvalidations[0].arguments[1]) === registeredRevision &&
    jointId?.startsWith(`${registeredSource}#component:`) &&
    worldId?.startsWith(`${registeredSource}#component:`),
  authoredDirectJointInputs: authoredDirectProof,
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
const proof = { schemaVersion: "store-values-build-proof-v1",
  status: exitCode === 0 && !spawnError && !stopReason && transformed.length === 2 && Object.values(assertions).every(Boolean) && assets.length > 0 &&
    inputAudit.every((item) => item.expected === item.actual) && compilerAfter === lock.compiler.sha256
    ? "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW" : "BUILD_FAILED_OR_INCOMPLETE",
  exitCode, stopReason, nodeVersion: process.version, command: [node, vite, "build", "--config", path.join(stage, "vite.config.ts")],
  sourceLockSha256: sha(lockBytes), compiler: { ...lock.compiler, sha256After: compilerAfter }, assertions,
  jointProgram: { id: jointId, inputs: jointInputs.length, revision: registeredRevision }, world: { id: worldId, site: worldSite, descriptors: closedNumeric.length }, transformed, assets, inputAudit, errors: spawnError ? [spawnError] : [],
  logs: { stdout: "vite.stdout.log", stderr: "vite.stderr.log" } };
await writeFile(path.join(proofDir, "build-proof.json"), JSON.stringify(proof, null, 2) + "\n", { flag: "wx" });
if (proof.status !== "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW") process.exitCode = exitCode || 1;
