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
assert.ok(proofDir.startsWith(path.join(root, "implementation/2026-10-18-host-reveal/benchmark/")));
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
const lock = { schemaVersion: "host-reveal-source-lock-v1", status: "FROZEN_BEFORE_BUILD", inputs: [],
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
const objects = [];
const visit = (node) => {
  if (!node || typeof node !== "object") return;
  if (node.type === "ObjectExpression") objects.push(node);
  for (const [key, child] of Object.entries(node)) {
    if (key === "loc" || key === "start" || key === "end") continue;
    if (Array.isArray(child)) for (const item of child) visit(item);
    else if (child && typeof child === "object") visit(child);
  }
};
const resourceProgramCandidates = [];
try { visit(parse(native, { sourceType: "unambiguous" }).program); } catch {}
for (const metadata of objects) {
  const program = property(metadata, "closedResourceHostProgram");
  if (!program || program.type !== "ObjectExpression") continue;
  const componentProgramId = literal(property(program, "componentProgramId"));
  const host = property(program, "host");
  const props = property(host, "props");
  const propPairs = props?.type === "ArrayExpression"
    ? props.elements.map((pair) => pair?.type === "ArrayExpression" ? pair.elements.map(literal) : [])
    : [];
  const evidence = { schemaVersion: literal(property(program, "schemaVersion")), componentProgramId,
    moduleRevision: literal(property(program, "moduleRevision")),
    resourceUseSiteId: literal(property(program, "resourceUseSiteId")), resourceProp: literal(property(program, "resourceProp")),
    hostTag: literal(property(host, "tag")), hostKey: literal(property(host, "key")),
    hostChild: literal(property(host, "child")), hostProps: propPairs };
  if (typeof componentProgramId === "string" && componentProgramId.endsWith("#component:BPrimary")) resourceProgramCandidates.push(evidence);
}
const resourceProgramEvidence = resourceProgramCandidates.length === 1 ? resourceProgramCandidates[0] : null;
const closedResourceHostProgram = resourceProgramEvidence !== null &&
  resourceProgramEvidence.schemaVersion === 1 &&
  typeof resourceProgramEvidence.componentProgramId === "string" && resourceProgramEvidence.componentProgramId.length > 0 &&
  resourceProgramEvidence.resourceProp === "resource" && resourceProgramEvidence.hostTag === "div" &&
  resourceProgramEvidence.hostKey === "b-primary" && resourceProgramEvidence.hostChild === "resource-value" &&
  resourceProgramEvidence.hostProps.length === 1 && resourceProgramEvidence.hostProps[0]?.length === 2 &&
  resourceProgramEvidence.hostProps[0]?.[0] === "data-b" && resourceProgramEvidence.hostProps[0]?.[1] === "primary" &&
  typeof resourceProgramEvidence.moduleRevision === "string" && resourceProgramEvidence.moduleRevision.length > 0 &&
  typeof resourceProgramEvidence.resourceUseSiteId === "string" && resourceProgramEvidence.resourceUseSiteId.length > 0;
const assertions = {
  nativeComponentLowering: /__nativeDefineComponent\(/.test(native),
  nativeSuspenseSiteIdentity: /__nativeBoundarySite/.test(native),
  nativeResourceAndStoreReadLowering: /useAt/.test(native) && /useStoreAt/.test(native),
  nativeClosedResourceHostProgram: closedResourceHostProgram,
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
const proof = { schemaVersion: "host-reveal-build-proof-v1",
  status: exitCode === 0 && !spawnError && transformed.length === 2 && Object.values(assertions).every(Boolean) && assets.length > 0 &&
    inputAudit.every((item) => item.expected === item.actual) && compilerAfter === lock.compiler.sha256
    ? "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW" : "BUILD_FAILED_OR_INCOMPLETE",
  exitCode, nodeVersion: process.version, command: [node, vite, "build", "--config", path.join(stage, "vite.config.ts")],
  sourceLockSha256: sha(lockBytes), compiler: { ...lock.compiler, sha256After: compilerAfter }, assertions,
  resourceProgramEvidence, transformed, assets, inputAudit,
  errors: spawnError ? [spawnError] : [], logs: { stdout: "vite.stdout.log", stderr: "vite.stderr.log" } };
await writeFile(path.join(proofDir, "build-proof.json"), JSON.stringify(proof, null, 2) + "\n", { flag: "wx" });
if (proof.status !== "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW") process.exitCode = exitCode || 1;
