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
assert.ok(proofDir.startsWith(path.join(root, "implementation/2026-10-18-direct-intent/benchmark/")));
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
  if (entry.isFile() && /\.(ts|tsx|mjs|html|md)$/.test(entry.name)) {
    sourcePaths.add(path.relative(root, path.join(stage, entry.name)).replaceAll(path.sep, "/"));
  }
}
const inputs = [...sourcePaths].sort();
await mkdir(proofDir, { recursive: false });
const lock = { schemaVersion: "direct-intent-source-lock-v1", status: "FROZEN_BEFORE_BUILD", inputs: [],
  compiler: { path: path.relative(root, compiler).replaceAll(path.sep, "/"), sha256: await hashFile(compiler) } };
for (const input of inputs) lock.inputs.push({ path: input, sha256: await hashFile(path.join(root, input)) });
const lockBytes = Buffer.from(JSON.stringify(lock, null, 2) + "\n");
await writeFile(path.join(proofDir, "source-lock.json"), lockBytes, { flag: "wx" });

const vite = path.join(root, "node_modules/vite/bin/vite.js");
const child = spawn(node, [vite, "build", "--config", path.join(stage, "vite.config.ts")], {
  cwd: root, env: { ...process.env, DIRECT_INTENT_PROOF_DIR: proofDir }, stdio: ["ignore", "pipe", "pipe"],
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
const allNodes = (node, predicate) => {
  const found = [];
  const visit = (current) => {
    if (!current || typeof current !== "object") return;
    if (predicate(current)) found.push(current);
    for (const [key, child] of Object.entries(current)) {
      if (["loc", "start", "end"].includes(key)) continue;
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === "object") visit(child);
    }
  };
  visit(node);
  return found;
};
const parseTsx = (source) => parse(source, { sourceType: "unambiguous", plugins: ["jsx", "typescript"] }).program;
const nativeSource = await readFile(path.join(stage, "native_arm.tsx"), "utf8");
const reactSource = await readFile(path.join(stage, "react_arm.tsx"), "utf8");
const nativeSourceAst = parseTsx(nativeSource);
const reactSourceAst = parseTsx(reactSource);
const transformedNativeAst = native ? parseTsx(native) : null;
const transformedReactAst = reactCode ? parseTsx(reactCode) : null;
const named = (node, name) => node?.type === "Identifier" && node.name === name;
const objectProperty = (node, name) => node?.type === "ObjectExpression" ?
  node.properties.find((item) => item.type === "ObjectProperty" &&
    (named(item.key, name) || (item.key.type === "StringLiteral" && item.key.value === name)))?.value : null;
const memberCall = (node, object, method) => node?.type === "CallExpression" &&
  node.callee?.type === "MemberExpression" && named(node.callee.object, object) && named(node.callee.property, method);
const method = (ast, name) => findNode(ast, (node) => node.type === "ObjectMethod" && named(node.key, name));
const functionBody = (ast, name) => findNode(ast, (node) => node.type === "FunctionDeclaration" && named(node.id, name))?.body;
const registrationCalls = transformedNativeAst ? allNodes(transformedNativeAst, (node) =>
  node.type === "CallExpression" && named(node.callee, "__nativeDefineComponent")) : [];
const semanticPlans = transformedNativeAst ? allNodes(transformedNativeAst, (node) =>
  node.type === "CallExpression" && named(node.callee, "__registerNativeSemanticPlan")) : [];
const semanticPlan = semanticPlans[0]?.arguments[0];
const moduleRevision = objectProperty(semanticPlan, "module_revision");
const planSourceFile = objectProperty(semanticPlan, "source_file");
const planOwners = objectProperty(semanticPlan, "owners");
const planSources = objectProperty(semanticPlan, "sources");
const revisionInvalidations = transformedNativeAst ? allNodes(transformedNativeAst, (node) =>
  node.type === "CallExpression" && named(node.callee, "__invalidateNativeSemanticPlan")) : [];
const primaryRegistrations = registrationCalls.filter((node) => node.arguments[0]?.type === "StringLiteral" &&
  node.arguments[0].value.endsWith("#component:Primary") && named(node.arguments[1], "Primary"));
const primaryRegistration = primaryRegistrations[0];
const registrationMetadata = primaryRegistration?.arguments[2];
const metadataHasPropOnlySites = registrationMetadata?.type === "ObjectExpression" &&
  registrationMetadata.properties.some((item) => item.type === "ObjectProperty" && named(item.key, "propOnlySites"));
const primaryProgramId = primaryRegistration?.arguments[0]?.type === "StringLiteral" ?
  primaryRegistration.arguments[0].value : null;
const stringValue = (node) => node?.type === "StringLiteral" ? node.value : null;
const primaryOwners = (planOwners?.type === "ArrayExpression" ? planOwners.elements : []).filter((owner) =>
  stringValue(objectProperty(owner, "site_id")) === primaryProgramId);
const primaryStateSources = (planSources?.type === "ArrayExpression" ? planSources.elements : []).filter((source) =>
  stringValue(objectProperty(source, "owner_site_id")) === primaryProgramId &&
  stringValue(objectProperty(source, "kind")) === "state");
const nativePrimary = functionBody(nativeSourceAst, "Primary");
const nativeUseCalls = nativePrimary ? allNodes(nativePrimary, (node) => node.type === "CallExpression" && named(node.callee, "use")) : [];
const resourceRead = nativeUseCalls.find((node) => node.arguments[0]?.type === "MemberExpression" &&
  named(node.arguments[0].object, "props") && named(node.arguments[0].property, "resource"));
const controlRead = nativeUseCalls.find((node) => node.arguments[0]?.type === "CallExpression" &&
  named(node.arguments[0].callee, "use") && named(node.arguments[0].arguments[0], "controlStore"));
const nativeTransformedPrimary = functionBody(transformedNativeAst, "Primary");
const loweredUseCalls = nativeTransformedPrimary ? allNodes(nativeTransformedPrimary, (node) =>
  node.type === "CallExpression" && named(node.callee, "__nativeUseAt")) : [];
const loweredStateCalls = nativeTransformedPrimary ? allNodes(nativeTransformedPrimary, (node) =>
  node.type === "CallExpression" && named(node.callee, "__nativeUseStateAt")) : [];
const loweredSite = (node) => node?.arguments[0]?.type === "StringLiteral" &&
  node.arguments[0].value.includes("#component:Primary#") && node.arguments[0].value.length > 0;
const loweredResourceRead = loweredUseCalls.find((node) => loweredSite(node) &&
  node.arguments[1]?.type === "MemberExpression" && named(node.arguments[1].object, "props") &&
  named(node.arguments[1].property, "resource"));
const loweredControlStoreRead = loweredUseCalls.find((node) => loweredSite(node) &&
  named(node.arguments[1], "controlStore"));
const loweredControlResourceRead = loweredUseCalls.find((node) => loweredSite(node) &&
  node.arguments[1] === loweredControlStoreRead);
const nativeMount = functionBody(nativeSourceAst, "mountNative");
const resourceConstructors = nativeMount ? allNodes(nativeMount, (node) => node.type === "NewExpression" &&
  named(node.callee, "AsyncResource") && node.arguments[0]?.type === "MemberExpression" &&
  ["initial", "obsolete", "latest"].some((name) => named(node.arguments[0].object, name)) &&
  named(node.arguments[0].property, "promise")) : [];
const nativeRequests = method(nativeSourceAst, "beginRequests");
const nativeUpdates = nativeRequests ? allNodes(nativeRequests.body, (node) => memberCall(node, "root", "update")) : [];
const jsxProps = (node) => Object.fromEntries((node?.type === "JSXElement" ? node.openingElement.attributes : [])
  .filter((item) => item.type === "JSXAttribute")
  .map((item) => [item.name?.name, item.value?.type === "StringLiteral" ? item.value.value :
    item.value?.type === "JSXExpressionContainer" ? item.value.expression : null]));
const nativeRequestProps = nativeUpdates.map((node) => jsxProps(node.arguments[0]));
const nativeControlDispatch = nativeRequests ? allNodes(nativeRequests.body, (node) =>
  memberCall(node, "controlStore", "dispatch") && node.arguments[0]?.type === "MemberExpression" &&
  named(node.arguments[0].object, "pendingControl") && named(node.arguments[0].property, "promise")) : [];
const reactRequests = method(reactSourceAst, "beginRequests");
const reactTransitions = reactRequests ? allNodes(reactRequests.body, (node) =>
  node.type === "CallExpression" && named(node.callee, "startTransition") &&
  node.arguments.length === 1 && allNodes(node.arguments[0], (inner) => memberCall(inner, "root", "render")).length === 1) : [];
const reactRenderProps = reactTransitions.map((transition) => jsxProps(
  allNodes(transition.arguments[0], (node) => memberCall(node, "root", "render"))[0]?.arguments[0]));
const requestPropsMatch = (props, name, control) => props.label === name &&
  props.resource?.type === "Identifier" && props.resource.name === `${name}Resource` &&
  (!control || (props.control?.type === "MemberExpression" &&
    named(props.control.object, "pendingControl") && named(props.control.property, "promise")));
const sameTaskFinal = (ast) => {
  const settlement = method(ast, "settleLatest");
  if (!settlement || findNode(settlement.body, (node) => node.type === "AwaitExpression")) return false;
  const resolved = allNodes(settlement.body, (node) => node.type === "CallExpression" &&
    node.callee?.type === "MemberExpression" && named(node.callee.property, "resolve") &&
    ["latest", "pendingControl"].some((name) => named(node.callee.object, name)));
  return resolved.length === 2 && resolved.some((node) => named(node.callee.object, "latest") &&
    node.arguments[0]?.value === "latest value") && resolved.some((node) =>
    named(node.callee.object, "pendingControl") && node.arguments[0]?.value === "control next");
};
const assertions = {
  nativePrimaryRegistration: primaryRegistrations.length === 1 && metadataHasPropOnlySites,
  nativeModuleRevision: semanticPlans.length === 1 && moduleRevision?.type === "StringLiteral" &&
    /^native-v1-[a-f0-9]+$/.test(moduleRevision.value) && revisionInvalidations.length === 1 &&
    revisionInvalidations[0].arguments[0]?.value === planSourceFile?.value &&
    revisionInvalidations[0].arguments[1]?.value === moduleRevision.value,
  nativeTrackedPrimaryStateSource: primaryProgramId?.endsWith("#component:Primary") &&
    stringValue(planSourceFile) === primaryProgramId.slice(0, -"#component:Primary".length) &&
    primaryOwners.length === 1 && primaryStateSources.length === 1 &&
    stringValue(objectProperty(primaryStateSources[0], "provenance")) === "tracked" &&
    stringValue(objectProperty(primaryStateSources[0], "site_id")) ===
      loweredStateCalls[0]?.arguments[0]?.value,
  nativeSuspenseSiteIdentity: /__nativeBoundarySite/.test(native),
  nativeAuthoredOrderedHardInputs: resourceRead && controlRead && resourceRead.start < controlRead.start &&
    nativeUseCalls.length === 3,
  nativeLoweredResourceStoreAndState: loweredUseCalls.length === 3 && loweredResourceRead &&
    loweredControlStoreRead && loweredControlResourceRead && loweredStateCalls.length === 1 &&
    loweredSite(loweredStateCalls[0]) && loweredResourceRead.start < loweredControlResourceRead.start &&
    loweredControlStoreRead.start > loweredControlResourceRead.start &&
    loweredStateCalls[0].start > loweredControlResourceRead.start,
  nativeDirectResourceHandles: resourceConstructors.length === 3,
  nativeDirectUpdates: nativeUpdates.length === 2 && nativeControlDispatch.length === 1 &&
    nativeControlDispatch[0].start < nativeUpdates[0].start && nativeUpdates[0].start < nativeUpdates[1].start &&
    requestPropsMatch(nativeRequestProps[0], "obsolete", false) &&
    requestPropsMatch(nativeRequestProps[1], "latest", false),
  reactTransitionsAndRootRenders: reactTransitions.length === 2 &&
    reactRenderProps[0]?.label === "obsolete" && reactRenderProps[1]?.label === "latest" &&
    ["obsolete", "latest"].every((name, index) => reactRenderProps[index]?.resource?.type === "MemberExpression" &&
      named(reactRenderProps[index].resource.object, name) && named(reactRenderProps[index].resource.property, "promise") &&
      reactRenderProps[index].control?.type === "MemberExpression" &&
      named(reactRenderProps[index].control.object, "pendingControl") &&
      named(reactRenderProps[index].control.property, "promise")),
  nativeReactFinalSameTaskSettlement: sameTaskFinal(nativeSourceAst) && sameTaskFinal(reactSourceAst),
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
const proof = { schemaVersion: "direct-intent-build-proof-v1",
  status: exitCode === 0 && !spawnError && transformed.length === 2 && Object.values(assertions).every(Boolean) && assets.length > 0 &&
    inputAudit.every((item) => item.expected === item.actual) && compilerAfter === lock.compiler.sha256
    ? "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW" : "BUILD_FAILED_OR_INCOMPLETE",
  exitCode, nodeVersion: process.version, command: [node, vite, "build", "--config", path.join(stage, "vite.config.ts")],
  sourceLockSha256: sha(lockBytes), compiler: { ...lock.compiler, sha256After: compilerAfter }, assertions,
  primaryRegistrationCount: primaryRegistrations.length, transformed, assets, inputAudit,
  errors: spawnError ? [spawnError] : [], logs: { stdout: "vite.stdout.log", stderr: "vite.stderr.log" } };
await writeFile(path.join(proofDir, "build-proof.json"), JSON.stringify(proof, null, 2) + "\n", { flag: "wx" });
if (proof.status !== "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW") process.exitCode = exitCode || 1;
