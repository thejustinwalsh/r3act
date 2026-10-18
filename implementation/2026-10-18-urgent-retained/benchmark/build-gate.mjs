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
assert.ok(proofDir.startsWith(path.join(root, "implementation/2026-10-18-urgent-retained/benchmark/")));
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
  if (entry.isFile() && /\.(ts|tsx|mjs|html|py)$/.test(entry.name)) sourcePaths.add(path.relative(root, path.join(stage, entry.name)).replaceAll(path.sep, "/"));
}
const inputs = [...sourcePaths].sort();
await mkdir(proofDir, { recursive: false });
const lock = { schemaVersion: "urgent-retained-source-lock-v1", status: "FROZEN_BEFORE_BUILD", inputs: [],
  compiler: { path: path.relative(root, compiler).replaceAll(path.sep, "/"), sha256: await hashFile(compiler) } };
for (const input of inputs) lock.inputs.push({ path: input, sha256: await hashFile(path.join(root, input)) });
const lockBytes = Buffer.from(JSON.stringify(lock, null, 2) + "\n");
await writeFile(path.join(proofDir, "source-lock.json"), lockBytes, { flag: "wx" });

const vite = path.join(root, "node_modules/vite/bin/vite.js");
const child = spawn(node, [vite, "build", "--config", path.join(stage, "vite.config.ts")], {
  cwd: root, env: { ...process.env, URGENT_RETAINED_PROOF_DIR: proofDir }, stdio: ["ignore", "pipe", "pipe"],
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
const ast = (code, plugins = ["typescript", "jsx"]) => parse(code, { sourceType: "unambiguous", plugins }).program;
const nativeAst = ast(native);
const authoredNativeAst = ast(nativeSource);
const authoredReactAst = ast(reactSource);
const property = (node, name) => node?.type === "ObjectExpression"
  ? node.properties.find((item) => item.type === "ObjectProperty" &&
    ((item.key.type === "Identifier" && item.key.name === name) ||
      (item.key.type === "StringLiteral" && item.key.value === name)))?.value
  : null;
const unwrap = (node) => node?.type === "TSAsExpression" || node?.type === "TSSatisfiesExpression" ? unwrap(node.expression) : node;
const literal = (node) => node?.type === "StringLiteral" ? node.value
  : node?.type === "NumericLiteral" ? node.value
  : node?.type === "BooleanLiteral" ? node.value : undefined;
const walkAst = (node, visit) => {
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const [key, child] of Object.entries(node)) {
    if (["loc", "start", "end", "extra", "comments", "leadingComments", "trailingComments"].includes(key)) continue;
    if (Array.isArray(child)) child.forEach((item) => walkAst(item, visit));
    else if (child && typeof child === "object") walkAst(child, visit);
  }
};
const findFunction = (program, name) => {
  let result = null;
  walkAst(program, (node) => { if (node.type === "FunctionDeclaration" && node.id?.name === name) result = node; });
  return result;
};
const defineLocals = new Set();
const calls = [];
walkAst(nativeAst, (node) => {
  if (node.type === "ImportDeclaration" && String(node.source.value).includes("native_runtime_api")) {
    for (const specifier of node.specifiers) {
      if (specifier.type === "ImportSpecifier" && (specifier.imported.name ?? specifier.imported.value) === "defineComponent") defineLocals.add(specifier.local.name);
    }
  }
  if (node.type === "CallExpression" && node.callee.type === "Identifier" && defineLocals.has(node.callee.name)) calls.push(node);
});
const buttonRegistration = calls.find((call) => literal(call.arguments[0])?.endsWith("#component:NumericControl") &&
  call.arguments[1]?.type === "Identifier" && call.arguments[1].name === "NumericControl");
const metadata = buttonRegistration?.arguments[2];
const stateLayout = property(metadata, "stateLayout");
const layoutSlots = property(stateLayout, "slots");
const stateSlot = Array.isArray(layoutSlots?.elements) ? layoutSlots.elements.find((item) =>
  literal(property(item, "siteId"))?.endsWith("#state:0") && literal(property(item, "slot")) === 0) : null;
const propOnlySites = unwrap(property(metadata, "propOnlySites"))?.elements?.map(literal) ?? [];
const programTable = (() => {
  let result = null;
  walkAst(nativeAst, (node) => {
    if (node.type === "VariableDeclarator" && node.id?.type === "Identifier" && node.id.name === "__nativeNumericPrograms") result = unwrap(node.init);
  });
  return result;
})();
const numericDescriptors = programTable?.type === "ArrayExpression" ? programTable.elements : [];
const componentId = literal(buttonRegistration?.arguments[0]);
const stateSite = componentId ? `${componentId}#state:0` : "";
const relevantDescriptors = numericDescriptors.filter((descriptor) => {
  const owner = literal(property(descriptor, "ownerProgramId"));
  const sources = unwrap(property(descriptor, "sourceSites"))?.elements?.map(literal) ?? [];
  return owner === componentId && sources.includes(stateSite) && property(descriptor, "closedExpression");
});
const closedExpressionShapes = relevantDescriptors.map((descriptor) => {
  const expression = property(descriptor, "closedExpression");
  const kind = literal(property(expression, "kind"));
  const operator = literal(property(expression, "operator"));
  const sourceSites = unwrap(property(descriptor, "sourceSites"))?.elements?.map(literal) ?? [];
  return { sinkId: literal(property(descriptor, "sinkId")), sourceSites, kind, operator,
    inputIndex: literal(property(expression, "index")), leftKind: literal(property(property(expression, "left"), "kind")),
    leftIndex: literal(property(property(expression, "left"), "index")), rightKind: literal(property(property(expression, "right"), "kind")),
    rightValue: literal(property(property(expression, "right"), "value")) };
});
const directStateSink = closedExpressionShapes.some((item) => item.kind === "input" && item.inputIndex === 0);
const opacitySink = closedExpressionShapes.some((item) => item.kind === "binary" && item.operator === "/" &&
  item.leftKind === "input" && item.leftIndex === 0 && item.rightKind === "literal" && item.rightValue === 10);
const descriptorsMatchState = relevantDescriptors.length === 2 && closedExpressionShapes.every((item) =>
  item.sourceSites.length === 1 && item.sourceSites[0] === stateSite);
const propOnlySitesMatchState = propOnlySites.length === 1 && propOnlySites[0] === stateSite;
const sourceButton = findFunction(authoredNativeAst, "NumericControl");
const reactButton = findFunction(authoredReactAst, "NumericControl");
const jsxButton = (fn) => {
  let opening = null;
  walkAst(fn?.body, (node) => { if (node.type === "JSXOpeningElement" && node.name?.type === "JSXIdentifier" && node.name.name === "button") opening = node; });
  return opening;
};
const attr = (node, name) => node?.attributes?.find((item) => item.type === "JSXAttribute" && item.name?.name === name);
const authoredButtonContract = (fn) => {
  if (!fn) return false;
  let stateInitializer = false;
  walkAst(fn.body, (node) => {
    if (node.type === "VariableDeclarator" && node.id?.type === "ArrayPattern" &&
      node.id.elements[0]?.name === "x" && node.id.elements[1]?.name === "setX" &&
      node.init?.type === "CallExpression" && node.init.callee?.type === "Identifier" &&
      node.init.callee.name === "useState" && literal(node.init.arguments[0]) === 1) stateInitializer = true;
  });
  const opening = jsxButton(fn);
  const dataX = attr(opening, "data-x")?.value?.expression;
  const style = attr(opening, "style")?.value?.expression;
  const opacity = property(style, "opacity");
  const onClick = attr(opening, "onClick")?.value?.expression;
  const updater = onClick?.body?.arguments?.[0];
  const body = fn.body?.body?.find((statement) => statement.type === "ReturnStatement")?.argument;
  const label = body?.children?.filter((child) => child.type === "JSXText" && child.value.trim().length > 0);
  return stateInitializer && dataX?.type === "Identifier" && dataX.name === "x" &&
    opacity?.type === "BinaryExpression" && opacity.operator === "/" &&
    opacity.left?.type === "Identifier" && opacity.left.name === "x" && literal(opacity.right) === 10 &&
    onClick?.type === "ArrowFunctionExpression" && onClick.body?.type === "CallExpression" &&
    onClick.body.callee?.type === "Identifier" && onClick.body.callee.name === "setX" &&
    updater?.type === "ArrowFunctionExpression" && updater.params[0]?.name === "n" &&
    updater.body?.type === "BinaryExpression" && updater.body.operator === "+" &&
    updater.body.left?.name === "n" && literal(updater.body.right) === 1 &&
    label?.length === 1 && label[0].value.trim() === "Increment";
};
const nativeCompiledButton = jsxButton(findFunction(nativeAst, "NumericControl"));
const containsStateBinding = (node) => {
  let found = false;
  walkAst(node, (child) => { if (child.type === "Identifier" && /BindStateProp/.test(child.name)) found = true; });
  return found;
};
const compiledNumericComponent = findFunction(nativeAst, "NumericControl");
const compiledBindings = [];
walkAst(compiledNumericComponent?.body, (node) => {
  if (node.type === "CallExpression" && node.callee?.type === "Identifier" && /BindStateProp/.test(node.callee.name)) compiledBindings.push(node);
});
const nativeCompiledButtonUsesBothOutputs = nativeCompiledButton
  ? containsStateBinding(attr(nativeCompiledButton, "data-x")) && containsStateBinding(attr(nativeCompiledButton, "style"))
  : compiledBindings.length >= 2;
const assertions = {
  nativeButtonAuthoredStateAndProps: authoredButtonContract(sourceButton) && authoredButtonContract(reactButton),
  nativeRegisteredNumericControl: Boolean(buttonRegistration),
  nativeNumericStateLayoutSlot0: Boolean(stateSlot) && literal(property(stateLayout, "schemaVersion")) === 1,
  nativePropOnlySitesMatchState: propOnlySitesMatchState,
  nativeClosedStateOutputPrograms: directStateSink && opacitySink && descriptorsMatchState,
  nativeCompiledButtonUsesStateBindings: nativeCompiledButtonUsesBothOutputs,
  nativeAuthoredClickLabelAndNoStateChildren: /onClick=\{\(\) => setX\(\(n\) => n \+ 1\)\}/.test(nativeSource) && /Increment/.test(nativeSource),
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
const proof = { schemaVersion: "urgent-retained-build-proof-v1",
  status: exitCode === 0 && !spawnError && transformed.length === 2 && Object.values(assertions).every(Boolean) && assets.length > 0 &&
    inputAudit.every((item) => item.expected === item.actual) && compilerAfter === lock.compiler.sha256
    ? "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW" : "BUILD_FAILED_OR_INCOMPLETE",
  exitCode, nodeVersion: process.version, command: [node, vite, "build", "--config", path.join(stage, "vite.config.ts")],
  sourceLockSha256: sha(lockBytes), compiler: { ...lock.compiler, sha256After: compilerAfter }, assertions,
  closedExpressionShapes, propOnlySites, transformed, assets, inputAudit, errors: spawnError ? [spawnError] : [],
  logs: { stdout: "vite.stdout.log", stderr: "vite.stderr.log" } };
await writeFile(path.join(proofDir, "build-proof.json"), JSON.stringify(proof, null, 2) + "\n", { flag: "wx" });
if (proof.status !== "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW") process.exitCode = exitCode || 1;
