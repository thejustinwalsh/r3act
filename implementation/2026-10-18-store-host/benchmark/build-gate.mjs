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
assert.ok(proofDir.startsWith(path.join(root, "implementation/2026-10-18-store-host/benchmark/")));
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
const lock = { schemaVersion: "store-host-source-lock-v1", status: "FROZEN_BEFORE_BUILD", inputs: [],
  compiler: { path: path.relative(root, compiler).replaceAll(path.sep, "/"), sha256: await hashFile(compiler) } };
for (const input of inputs) lock.inputs.push({ path: input, sha256: await hashFile(path.join(root, input)) });
const lockBytes = Buffer.from(JSON.stringify(lock, null, 2) + "\n");
await writeFile(path.join(proofDir, "source-lock.json"), lockBytes, { flag: "wx" });

const vite = path.join(root, "node_modules/vite/bin/vite.js");
const child = spawn(node, [vite, "build", "--config", path.join(stage, "vite.config.ts")], {
  cwd: root, env: { ...process.env, STORE_HOST_PROOF_DIR: proofDir }, stdio: ["ignore", "pipe", "pipe"],
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
const aliases = { define: new Set(), useAt: new Set() };
walkAst(transformedAst, (node) => {
  if (node.type !== "ImportDeclaration" || !String(node.source.value).includes("native_runtime_api")) return;
  for (const item of node.specifiers) {
    if (item.type !== "ImportSpecifier") continue;
    const imported = item.imported.name ?? item.imported.value;
    if (imported === "defineComponent") aliases.define.add(item.local.name);
    if (imported === "useAt") aliases.useAt.add(item.local.name);
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
const closed = ["Position", "DoublePosition"].map((name) => {
  const registration = registrations.find((call) => literal(call.arguments[0])?.endsWith(`#component:${name}`));
  const id = literal(registration?.arguments[0]);
  const metadata = registration?.arguments[2];
  const program = property(metadata, "closedStoreHostProgram");
  const host = property(program, "host");
  const props = unwrap(property(host, "props"))?.elements ?? [];
  const firstProp = props[0]?.elements ?? [];
  const expression = firstProp[1];
  const fn = functions(transformedAst, name)[0];
  const site = literal(property(program, "storeUseSiteId"));
  const useCalls = [];
  walkAst(fn?.body, (node) => {
    if (node.type === "CallExpression" && node.callee.type === "Identifier" && aliases.useAt.has(node.callee.name)) useCalls.push(node);
  });
  return { name, id, site, revision: literal(property(program, "moduleRevision")),
    metadataRevision: literal(property(property(metadata, "semanticRevision"), "moduleRevision")) ??
      literal(property(property(metadata, "stateLayout"), "moduleRevision")),
    schema: literal(property(program, "schemaVersion")),
    componentProgramId: literal(property(program, "componentProgramId")),
    storeProp: literal(property(program, "storeProp")),
    tag: literal(property(host, "tag")), key: literal(property(host, "key")), child: property(host, "child")?.type,
    outputName: literal(firstProp[0]), expressionKind: literal(property(expression, "kind")),
    expressionOperator: literal(property(expression, "operator")),
    inputIndex: literal(property(expression, "index")),
    leftKind: literal(property(property(expression, "left"), "kind")),
    leftIndex: literal(property(property(expression, "left"), "index")),
    rightKind: literal(property(property(expression, "right"), "kind")),
    rightValue: literal(property(property(expression, "right"), "value")),
    propCount: props.length, useSites: useCalls.map((call) => literal(call.arguments[0])),
    useInputs: useCalls.map((call) => call.arguments[1]?.type === "MemberExpression" &&
      call.arguments[1].object?.name === "props" && call.arguments[1].property?.name === "position") };
});
const authoredUse = (program, name, outputName, doubled) => {
  const fn = functions(program, name)[0];
  let direct = false;
  let output = false;
  walkAst(fn?.body, (node) => {
    if (node.type === "CallExpression" && node.callee?.name === "use" &&
      node.arguments[0]?.type === "MemberExpression" && node.arguments[0].object?.name === "props" &&
      node.arguments[0].property?.name === "position") direct = true;
    if (node.type === "JSXOpeningElement" && node.name?.name === "output") {
      const attr = node.attributes.find((item) => item.type === "JSXAttribute" && item.name?.name === outputName);
      const value = attr?.value?.expression;
      output = doubled ? value?.type === "BinaryExpression" && value.operator === "*" &&
        value.left?.name === "x" && literal(value.right) === 2 : value?.name === "x";
    }
  });
  return direct && output;
};
const authoredReactOutput = (name, outputName, doubled) => {
  const fn = functions(authoredReactAst, name)[0];
  let read = false;
  let output = false;
  walkAst(fn?.body, (node) => {
    if (node.type === "CallExpression" && node.callee?.name === "useSyncExternalStore" &&
      node.arguments[0]?.property?.name === "subscribe" &&
      node.arguments[1]?.property?.name === "getSnapshot") read = true;
    if (node.type === "JSXOpeningElement" && node.name?.name === "output") {
      const attr = node.attributes.find((item) => item.type === "JSXAttribute" && item.name?.name === outputName);
      const value = attr?.value?.expression;
      output = doubled ? value?.type === "BinaryExpression" && value.operator === "*" &&
        value.left?.name === "x" && literal(value.right) === 2 : value?.name === "x";
    }
  });
  return read && output;
};
const closedProof = closed.length === 2 && closed.every((item) =>
  item.id && item.schema === 1 && item.componentProgramId === item.id &&
  item.revision && item.storeProp === "position" && item.tag === "output" &&
  item.child === "NullLiteral" && item.propCount === 1 && item.useSites.length === 1 &&
  item.useInputs.length === 1 && item.useInputs[0] === true &&
  item.site === item.useSites[0] && item.site === `${item.id}#store:0` &&
  (!item.metadataRevision || item.metadataRevision === item.revision)) &&
  closed[0].revision === closed[1].revision &&
  closed[0].key === "position" && closed[0].outputName === "data-x" &&
  closed[0].expressionKind === "input" && closed[0].inputIndex === 0 &&
  closed[1].key === "double-position" && closed[1].outputName === "data-double" &&
  closed[1].expressionKind === "binary" && closed[1].expressionOperator === "*" &&
  closed[1].leftKind === "input" && closed[1].leftIndex === 0 &&
  closed[1].rightKind === "literal" && closed[1].rightValue === 2;
const assertions = {
  nativeBothClosedStoreHosts: closedProof,
  nativeRegisteredRevisionAndInvalidation: semanticPlans.length === 1 &&
    /^native-v1-[a-f0-9]+$/.test(registeredRevision ?? "") &&
    revisionInvalidations.length === 1 &&
    literal(revisionInvalidations[0].arguments[0]) === registeredSource &&
    literal(revisionInvalidations[0].arguments[1]) === registeredRevision &&
    closed.every((item) => item.revision === registeredRevision &&
      item.id?.startsWith(`${registeredSource}#component:`)),
  nativeAuthoredDirectStoreInputs: authoredUse(authoredNativeAst, "Position", "data-x", false) &&
    authoredUse(authoredNativeAst, "DoublePosition", "data-double", true),
  reactAuthoredDirectExternalInputs: authoredReactOutput("Position", "data-x", false) &&
    authoredReactOutput("DoublePosition", "data-double", true),
  nativeCompiledStableUseSites: closed.every((item) => item.useSites.length === 1 && item.useSites[0] === item.site),
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
const proof = { schemaVersion: "store-host-build-proof-v1",
  status: exitCode === 0 && !spawnError && transformed.length === 2 && Object.values(assertions).every(Boolean) && assets.length > 0 &&
    inputAudit.every((item) => item.expected === item.actual) && compilerAfter === lock.compiler.sha256
    ? "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW" : "BUILD_FAILED_OR_INCOMPLETE",
  exitCode, nodeVersion: process.version, command: [node, vite, "build", "--config", path.join(stage, "vite.config.ts")],
  sourceLockSha256: sha(lockBytes), compiler: { ...lock.compiler, sha256After: compilerAfter }, assertions,
  closedStorePrograms: closed, transformed, assets, inputAudit, errors: spawnError ? [spawnError] : [],
  logs: { stdout: "vite.stdout.log", stderr: "vite.stderr.log" } };
await writeFile(path.join(proofDir, "build-proof.json"), JSON.stringify(proof, null, 2) + "\n", { flag: "wx" });
if (proof.status !== "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW") process.exitCode = exitCode || 1;
