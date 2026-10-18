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
assert.ok(proofDir.startsWith(path.join(root, "implementation/2026-10-18-reveal-workset/benchmark/")));
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
const sourcePaths = new Set(["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.r3act-packages.json", "vite.config.ts",
  "deno.json", "deno.lock", "compiler/oxc-spike/Cargo.toml", "compiler/oxc-spike/Cargo.lock",
  "implementation/2026-10-16-publication/verification/deno-runtime.lock"]);
for (const base of ["src", "compiler", "packages", "scripts"]) {
  for (const filename of await walk(path.join(root, base))) sourcePaths.add(path.relative(root, filename).replaceAll(path.sep, "/"));
}
for (const entry of await readdir(stage, { withFileTypes: true })) {
  if (entry.isFile() && /\.(ts|tsx|mjs|html)$/.test(entry.name)) {
    sourcePaths.add(path.relative(root, path.join(stage, entry.name)).replaceAll(path.sep, "/"));
  }
}
const inputs = [...sourcePaths].sort();
await mkdir(proofDir, { recursive: false });
const lock = { schemaVersion: "reveal-workset-source-lock-v1", status: "FROZEN_BEFORE_BUILD", inputs: [],
  compiler: { path: path.relative(root, compiler).replaceAll(path.sep, "/"), sha256: await hashFile(compiler) } };
for (const input of inputs) lock.inputs.push({ path: input, sha256: await hashFile(path.join(root, input)) });
const lockBytes = Buffer.from(JSON.stringify(lock, null, 2) + "\n");
await writeFile(path.join(proofDir, "source-lock.json"), lockBytes, { flag: "wx" });

const vite = path.join(root, "node_modules/vite/bin/vite.js");
const child = spawn(node, [vite, "build", "--config", path.join(stage, "vite.config.ts")], {
  cwd: root, env: { ...process.env, HOST_REVEAL_PROOF_DIR: proofDir }, stdio: ["ignore", "pipe", "pipe"],
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
const transformed = [];
for (const name of ["native_arm.tsx.js", "react_arm.tsx.js"]) {
  const filename = path.join(proofDir, "transforms", name);
  try { transformed.push({ path: path.relative(root, filename).replaceAll(path.sep, "/"), sha256: await hashFile(filename), bytes: (await stat(filename)).size }); }
  catch {}
}
const native = await readFile(path.join(proofDir, "transforms/native_arm.tsx.js"), "utf8").catch(() => "");
const reactCode = await readFile(path.join(proofDir, "transforms/react_arm.tsx.js"), "utf8").catch(() => "");
const property = (node, name) => node?.type === "ObjectExpression"
  ? node.properties.find((item) => item.type === "ObjectProperty" &&
    ((item.key.type === "Identifier" && item.key.name === name) ||
      (item.key.type === "StringLiteral" && item.key.value === name)))?.value
  : null;
const literal = (node) => node?.type === "StringLiteral" ? node.value
  : node?.type === "NumericLiteral" ? node.value
  : node?.type === "BooleanLiteral" ? node.value
  : node?.type === "NullLiteral" ? null
  : undefined;
const defineComponentLocals = new Set();
const registrations = [];
const visit = (node) => {
  if (!node || typeof node !== "object") return;
  if (node.type === "ImportDeclaration" &&
    String(node.source.value).includes("native_runtime_api")) {
    for (const specifier of node.specifiers) {
      if (specifier.type !== "ImportSpecifier") continue;
      const imported = specifier.imported.name ?? specifier.imported.value;
      if (imported === "defineComponent") defineComponentLocals.add(specifier.local.name);
    }
  }
  if (node.type === "CallExpression" && node.callee.type === "Identifier" &&
    defineComponentLocals.has(node.callee.name)) {
    const componentProgramId = literal(node.arguments[0]);
    const component = node.arguments[1];
    const metadata = node.arguments[2];
    if (typeof componentProgramId === "string" &&
      ["BPrimary", "CPrimary"].some((name) => componentProgramId.endsWith(`#component:${name}`)) &&
      component?.type === "Identifier" && metadata?.type === "ObjectExpression") {
      const program = property(metadata, "closedResourceHostProgram");
      if (program) registrations.push({ component: component.name, program });
    }
  }
  for (const [key, child] of Object.entries(node)) {
    if (key === "loc" || key === "start" || key === "end") continue;
    if (Array.isArray(child)) for (const item of child) visit(item);
    else if (child && typeof child === "object") visit(child);
  }
};
try { visit(parse(native, { sourceType: "unambiguous" }).program); } catch {}
const resourceProgramEvidence = {};
const resourceProgramCounts = { BPrimary: 0, CPrimary: 0 };
for (const registration of registrations) {
  if (!["BPrimary", "CPrimary"].includes(registration.component)) continue;
  resourceProgramCounts[registration.component]++;
  const program = registration.program;
  if (program.type !== "ObjectExpression") continue;
  const componentProgramId = literal(property(program, "componentProgramId"));
  if (typeof componentProgramId !== "string" || !componentProgramId.endsWith(`#component:${registration.component}`)) continue;
  const host = property(program, "host");
  const props = property(host, "props");
  const propPairs = props?.type === "ArrayExpression"
    ? props.elements.map((pair) => pair?.type === "ArrayExpression" ? pair.elements.map(literal) : [])
    : [];
  resourceProgramEvidence[registration.component] = { schemaVersion: literal(property(program, "schemaVersion")), componentProgramId,
    moduleRevision: literal(property(program, "moduleRevision")),
    resourceUseSiteId: literal(property(program, "resourceUseSiteId")), resourceProp: literal(property(program, "resourceProp")),
    hostTag: literal(property(host, "tag")), hostKey: literal(property(host, "key")),
    hostChild: literal(property(host, "child")), hostProps: propPairs };
}
const validClosedResourceProgram = (component, key, dataName) => {
  const evidence = resourceProgramEvidence[component];
  return resourceProgramCounts[component] === 1 && evidence?.schemaVersion === 1 && typeof evidence.componentProgramId === "string" &&
    typeof evidence.moduleRevision === "string" && evidence.moduleRevision.length > 0 &&
    typeof evidence.resourceUseSiteId === "string" && evidence.resourceUseSiteId.length > 0 &&
    evidence.resourceProp === "resource" && evidence.hostTag === "div" && evidence.hostKey === key &&
    evidence.hostChild === "resource-value" && evidence.hostProps.length === 1 &&
    evidence.hostProps[0]?.length === 2 && evidence.hostProps[0]?.[0] === dataName &&
    evidence.hostProps[0]?.[1] === "primary";
};
const closedResourceHostPrograms = validClosedResourceProgram("BPrimary", "b-primary", "data-b") &&
  validClosedResourceProgram("CPrimary", "c-primary", "data-c");
const nativeSource = await readFile(path.join(stage, "native_arm.tsx"), "utf8");
const nativeSourceAst = parse(nativeSource, { sourceType: "unambiguous", plugins: ["jsx", "typescript"] }).program;
const reactSource = await readFile(path.join(stage, "react_arm.tsx"), "utf8");
const reactSourceAst = parse(reactSource, { sourceType: "unambiguous", plugins: ["jsx", "typescript"] }).program;
const findNode = (node, predicate) => {
  if (!node || typeof node !== "object") return null;
  if (predicate(node)) return node;
  for (const [key, child] of Object.entries(node)) {
    if (["loc", "start", "end"].includes(key)) continue;
    if (Array.isArray(child)) {
      for (const item of child) { const found = findNode(item, predicate); if (found) return found; }
    } else if (child && typeof child === "object") {
      const found = findNode(child, predicate); if (found) return found;
    }
  }
  return null;
};
const mountNativeFunction = findNode(nativeSourceAst, (node) => node.type === "FunctionDeclaration" && node.id?.name === "mountNative");
const aPrimaryFunction = findNode(nativeSourceAst, (node) => node.type === "FunctionDeclaration" && node.id?.name === "APrimary");
const aValueDeclaration = aPrimaryFunction && findNode(aPrimaryFunction.body, (node) =>
  node.type === "VariableDeclarator" && node.id?.type === "Identifier" && node.id.name === "value");
const outerUse = aValueDeclaration?.init;
const innerUse = outerUse?.type === "CallExpression" ? outerUse.arguments[0] : null;
const nativeStoreThenResourceSource = outerUse?.type === "CallExpression" && outerUse.callee?.type === "Identifier" &&
  outerUse.callee.name === "use" && innerUse?.type === "CallExpression" && innerUse.callee?.type === "Identifier" &&
  innerUse.callee.name === "use" && innerUse.arguments[0]?.type === "Identifier" && innerUse.arguments[0].name === "aStore";
const directResourceInMount = (name, promiseName) => {
  let count = 0;
  const visitMount = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "VariableDeclarator" && node.id?.type === "Identifier" && node.id.name === name &&
      node.init?.type === "NewExpression" && node.init.callee?.type === "Identifier" && node.init.callee.name === "AsyncResource") {
      const argument = node.init.arguments[0];
      if (argument?.type === "MemberExpression" && argument.object?.type === "Identifier" && argument.object.name === promiseName &&
        argument.property?.type === "Identifier" && argument.property.name === "promise") count++;
    }
    for (const [key, child] of Object.entries(node)) {
      if (["loc", "start", "end"].includes(key)) continue;
      if (Array.isArray(child)) child.forEach(visitMount); else if (child && typeof child === "object") visitMount(child);
    }
  };
  if (mountNativeFunction) visitMount(mountNativeFunction.body);
  return count === 1;
};
const nativeDirectResourcesInMount = directResourceInMount("resourceB", "pendingB") &&
  directResourceInMount("resourceC", "pendingC");
const appOpening = mountNativeFunction && findNode(mountNativeFunction.body, (node) =>
  node.type === "JSXOpeningElement" && node.name?.type === "JSXIdentifier" && node.name.name === "App");
const appResourceProps = Object.fromEntries((appOpening?.attributes ?? []).flatMap((attribute) =>
  attribute.type === "JSXAttribute" && attribute.name?.type === "JSXIdentifier" &&
    attribute.value?.type === "JSXExpressionContainer" && attribute.value.expression?.type === "Identifier"
    ? [[attribute.name.name, attribute.value.expression.name]] : []));
const synchronousSettlementPair = (ast) => {
  const method = findNode(ast, (node) => node.type === "ObjectMethod" && node.key?.type === "Identifier" && node.key.name === "settleBC");
  const calls = [];
  const collectCalls = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "CallExpression" && node.callee?.type === "MemberExpression" &&
      node.callee.object?.type === "Identifier" && ["pendingB", "pendingC"].includes(node.callee.object.name) &&
      node.callee.property?.type === "Identifier" && node.callee.property.name === "resolve" &&
      node.arguments.length === 1 && node.arguments[0]?.type === "StringLiteral") {
      calls.push([node.callee.object.name, node.arguments[0].value]);
    }
    for (const [key, child] of Object.entries(node)) {
      if (["loc", "start", "end"].includes(key)) continue;
      if (Array.isArray(child)) child.forEach(collectCalls); else if (child && typeof child === "object") collectCalls(child);
    }
  };
  if (method) collectCalls(method.body);
  return method && !findNode(method.body, (node) => node.type === "AwaitExpression") &&
    !findNode(method.body, (node) => node.type === "CallExpression" && node.callee?.type === "MemberExpression" &&
      node.callee.property?.type === "Identifier" && node.callee.property.name === "flush") &&
    calls.length === 2 && calls.some(([name, value]) => name === "pendingB" && value === "B ready") &&
    calls.some(([name, value]) => name === "pendingC" && value === "C ready");
};
const assertions = {
  nativeComponentLowering: /__nativeDefineComponent\(/.test(native),
  nativeSuspenseSiteIdentity: /__nativeBoundarySite/.test(native),
  nativeAuthoredStoreThenResourceRead: nativeStoreThenResourceSource,
  nativeClosedResourceHostPrograms: closedResourceHostPrograms,
  nativeDirectResourcesInMount: nativeDirectResourcesInMount && appResourceProps.resourceB === "resourceB" &&
    appResourceProps.resourceC === "resourceC",
  nativeReactSameTaskBCSettlement: synchronousSettlementPair(nativeSourceAst) && synchronousSettlementPair(reactSourceAst),
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
const proof = { schemaVersion: "reveal-workset-build-proof-v1",
  status: exitCode === 0 && !spawnError && transformed.length === 2 && Object.values(assertions).every(Boolean) && assets.length > 0 &&
    inputAudit.every((item) => item.expected === item.actual) && compilerAfter === lock.compiler.sha256
    ? "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW" : "BUILD_FAILED_OR_INCOMPLETE",
  exitCode, nodeVersion: process.version, command: [node, vite, "build", "--config", path.join(stage, "vite.config.ts")],
  sourceLockSha256: sha(lockBytes), compiler: { ...lock.compiler, sha256After: compilerAfter }, assertions,
  resourceProgramEvidence, resourceProgramCounts, transformed, assets, inputAudit,
  errors: spawnError ? [spawnError] : [], logs: { stdout: "vite.stdout.log", stderr: "vite.stderr.log" } };
await writeFile(path.join(proofDir, "build-proof.json"), JSON.stringify(proof, null, 2) + "\n", { flag: "wx" });
if (proof.status !== "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW") process.exitCode = exitCode || 1;
