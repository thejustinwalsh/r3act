import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, "../..");
const at = process.argv.indexOf("--proof-dir");
assert.ok(at >= 0 && process.argv[at + 1], "usage: node build.mjs --proof-dir ABSOLUTE_NEW_UNIT_DIR");
const proofDir = path.resolve(process.argv[at + 1]);
assert.ok(proofDir.startsWith(`${unit}${path.sep}`), "proof must be inside forked-transitions unit");
assert.equal(process.version, "v24.18.0");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hashFile = async filename => sha(await readFile(filename));
const rel = filename => path.relative(root, filename).replaceAll(path.sep, "/");
const walk = async directory => {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["target", "node_modules", ".git", "dist"].includes(entry.name) || /^(proof|gate|verification)-/.test(entry.name)) continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(filename));
    else if (entry.isFile() && /\.(ts|tsx|mjs|rs|json|html)$/.test(entry.name)) result.push(filename);
  }
  return result;
};
const walkAll = async directory => {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walkAll(filename));
    else if (entry.isFile()) result.push(filename);
    else throw new Error(`non-file artifact: ${filename}`);
  }
  return result;
};
const source = new Set([
  "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "vite.config.ts",
  "compiler/oxc-spike/Cargo.toml", "compiler/oxc-spike/Cargo.lock",
  "compiler/vite_native_plugin.ts", "compiler/vite_native_module.ts",
]);
for (const directory of ["src", "compiler", "implementation/2026-10-19-forked-transitions/comparison", "examples/forked-transitions"])
  for (const filename of await walk(path.join(root, directory))) source.add(rel(filename));
for (const filename of ["build.mjs", "verify-browser.mjs", "run-pair.mjs", "README.md"])
  source.add(rel(path.join(unit, filename)));
const compiler = path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const vite = path.join(root, "node_modules/vite/bin/vite.js");
await mkdir(proofDir, { recursive: false });
const record = { schemaVersion: "forked-transitions-build-proof-v1", status: "STARTED", nodeVersion: process.version,
  compiler: { path: rel(compiler), sha256: null, sha256After: null }, sourceLockSha256: null,
  build: null, assertions: {}, transforms: [], assets: [], sourceAfter: [], errors: [] };
let lockBytes;
try {
  record.compiler.sha256 = await hashFile(compiler);
  const lock = { schemaVersion: "forked-transitions-source-lock-v1", capturedBeforeCommand: true,
    compiler: { path: rel(compiler), sha256: record.compiler.sha256 }, inputs: [] };
  for (const filename of [...source].sort()) {
    const actual = path.join(root, filename);
    const digest = await hashFile(actual);
    const archive = path.join(proofDir, "inputs/source", filename);
    await mkdir(path.dirname(archive), { recursive: true });
    await copyFile(actual, archive);
    assert.equal(await hashFile(archive), digest);
    lock.inputs.push({ path: filename, sha256: digest });
  }
  const binaryCopy = path.join(proofDir, "inputs/compiler", path.basename(compiler));
  await mkdir(path.dirname(binaryCopy), { recursive: true });
  await copyFile(compiler, binaryCopy);
  assert.equal(await hashFile(binaryCopy), record.compiler.sha256);
  lock.compiler.archivePath = rel(binaryCopy);
  lockBytes = Buffer.from(JSON.stringify(lock, null, 2) + "\n");
  await writeFile(path.join(proofDir, "source-lock.json"), lockBytes, { flag: "wx" });
  record.sourceLockSha256 = sha(lockBytes);
  const command = [process.execPath, vite, "build", "--config", path.join(unit, "comparison/vite.config.ts")];
  const child = spawn(command[0], command.slice(1), { cwd: root, detached: true,
    env: { ...process.env, FORKED_TRANSITIONS_PROOF_DIR: proofDir }, stdio: ["ignore", "pipe", "pipe"] });
  const stdout = [], stderr = [];
  child.stdout.on("data", chunk => stdout.push(chunk));
  child.stderr.on("data", chunk => stderr.push(chunk));
  let spawnError = null, stopReason = null;
  const stop = reason => { stopReason ??= reason; if (child.pid) try { process.kill(-child.pid, "SIGKILL"); } catch {} };
  const interrupted = () => stop("signal");
  process.once("SIGINT", interrupted); process.once("SIGTERM", interrupted);
  const timer = setTimeout(() => stop("build-deadline-180s"), 180_000);
  const exitCode = await new Promise(resolve => {
    child.once("error", error => { spawnError = String(error); resolve(127); });
    child.once("close", code => resolve(code ?? 1));
  });
  clearTimeout(timer); process.off("SIGINT", interrupted); process.off("SIGTERM", interrupted);
  await writeFile(path.join(proofDir, "vite.stdout.log"), Buffer.concat(stdout), { flag: "wx" });
  await writeFile(path.join(proofDir, "vite.stderr.log"), Buffer.concat(stderr), { flag: "wx" });
  record.build = { command, exitCode, spawnError, stopReason, logs: ["vite.stdout.log", "vite.stderr.log"] };
  const nativeFiles = ["app.tsx", "scene.tsx"].map(name => path.join(proofDir, "transforms", `${name}.js`));
  const mainFile = path.join(proofDir, "transforms/main.tsx.js");
  const reactFile = path.join(proofDir, "transforms/react_arm.tsx.js");
  const nativeCodes = await Promise.all(nativeFiles.map(filename => readFile(filename, "utf8")));
  const mainCode = await readFile(mainFile, "utf8");
  const reactCode = await readFile(reactFile, "utf8");
  const eventFile = path.join(proofDir, "react-compiler-events.json");
  const reactCompilerEvents = JSON.parse(await readFile(eventFile, "utf8"));
  const visit = (node, fn) => {
    if (!node || typeof node !== "object") return;
    fn(node);
    for (const [key, value] of Object.entries(node)) {
      if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(item => visit(item, fn));
      else if (value && typeof value === "object") visit(value, fn);
    }
  };
  const ast = code => parse(code, { sourceType: "unambiguous", plugins: ["typescript", "jsx"] }).program;
  const property = (node, name) => node?.type === "ObjectExpression" ? node.properties.find(item =>
    item.type === "ObjectProperty" && (item.key.name ?? item.key.value) === name)?.value : null;
  const literal = node => node?.type === "StringLiteral" ? node.value : node?.type === "NumericLiteral" ? node.value : null;
  const nativeDefinitions = [], plans = [];
  for (const code of nativeCodes) {
    const nativeAst = ast(code);
    const registrars = new Set(nativeAst.body.filter(node => node.type === "ImportDeclaration")
      .flatMap(node => node.specifiers.filter(item => item.type === "ImportSpecifier" &&
        (item.imported.name ?? item.imported.value) === "registerCompiledSemanticPlan")
        .map(item => item.local.name)));
    visit(nativeAst, node => {
      if (node.type !== "CallExpression") return;
      if (/defineComponent/i.test(node.callee.name ?? "")) nativeDefinitions.push(node);
      if (registrars.has(node.callee.name)) plans.push(node.arguments[0]);
    });
  }
  const nativeMetadata = nativeDefinitions.map(definition => {
    const componentProgramId = literal(definition.arguments[0]);
    const metadata = definition.arguments[2];
    const closed = property(metadata, "closedStoreHostProgram") ?? property(metadata, "closedResourceHostProgram");
    return { componentProgramId, closedProgram: Boolean(closed &&
      literal(property(closed, "componentProgramId")) === componentProgramId) };
  });
  const reactFunctions = [];
  visit(ast(reactCode), node => { if (node.type === "FunctionDeclaration" && ["Projection", "Result", "App"].includes(node.id?.name)) reactFunctions.push(node); });
  const reactMemo = Object.fromEntries(["Projection", "Result", "App"].map(name => {
    const fn = reactFunctions.find(item => item.id?.name === name);
    const slots = [];
    if (fn) visit(fn.body, node => { if (node.type === "CallExpression" && node.callee.name === "_c" && node.arguments[0]?.type === "NumericLiteral")
      slots.push(node.arguments[0].value); });
    return [name, slots];
  }));
  const planRecords = ["app.tsx", "scene.tsx"].map(name => {
    const sourceFile = `examples/forked-transitions/${name}`;
    const plan = plans.find(item => literal(property(item, "source_file")) === sourceFile);
    const moduleRevision = literal(property(plan, "module_revision"));
    const ownerSites = property(plan, "owners")?.elements?.map(item => literal(property(item, "site_id"))) ?? [];
    return { sourceFile, moduleRevision, ownerSites,
      complete: typeof moduleRevision === "string" && /^native-v\d+-[0-9a-f]+$/.test(moduleRevision) && ownerSites.length > 0 };
  });
  record.assertions = { nativeMetadata, reactCompilerRuntime: reactCode.includes("react/compiler-runtime"), reactMemo,
    reactCompileSuccess: ["Projection", "Result", "App"].every(name =>
      reactCompilerEvents.some(event => event.kind === "CompileSuccess" && event.fnName === name)),
    expectedNativeDefinitions: nativeMetadata.length >= 4 && nativeMetadata.every(item =>
      typeof item.componentProgramId === "string" && item.componentProgramId.includes("#component:")),
    semanticPlans: planRecords,
    semanticPlanComplete: planRecords.every(item => item.complete) && nativeMetadata.every(item =>
      planRecords.some(plan => plan.ownerSites.includes(item.componentProgramId))),
    nativeEntrypointUsesActualRoots: mainCode.includes("NativeTaskTransitionQueue") &&
      mainCode.includes("NativeRootWorkQueue") && mainCode.includes("createThreeNativeRoot"),
    reactHotMemo: reactMemo.Projection.length > 0 && reactMemo.Result.length > 0 && reactMemo.App.length > 0 };
  for (const filename of [...nativeFiles, mainFile, reactFile]) record.transforms.push({ path: rel(filename), sha256: await hashFile(filename), bytes: (await stat(filename)).size });
  record.transforms.push({ path: rel(eventFile), sha256: await hashFile(eventFile), bytes: (await stat(eventFile)).size });
  for (const filename of await walkAll(path.join(proofDir, "dist"))) record.assets.push({ path: rel(filename),
    urlPath: "/" + path.relative(path.join(proofDir, "dist"), filename).replaceAll(path.sep, "/"),
    sha256: await hashFile(filename), bytes: (await stat(filename)).size });
  for (const item of lock.inputs) {
    const actual = await hashFile(path.join(root, item.path));
    record.sourceAfter.push({ path: item.path, expected: item.sha256, actual });
    assert.equal(actual, item.sha256, `source drift: ${item.path}`);
    assert.equal(await hashFile(path.join(proofDir, "inputs/source", item.path)), item.sha256);
  }
  record.compiler.sha256After = await hashFile(compiler);
  assert.equal(record.compiler.sha256After, record.compiler.sha256);
  assert.equal(exitCode, 0); assert.equal(stopReason, null); assert.equal(spawnError, null);
  assert.equal(record.assertions.expectedNativeDefinitions, true);
  assert.equal(record.assertions.semanticPlanComplete, true);
  assert.equal(record.assertions.nativeEntrypointUsesActualRoots, true);
  assert.equal(record.assertions.reactCompilerRuntime, true);
  assert.equal(record.assertions.reactHotMemo, true);
  assert.equal(record.assertions.reactCompileSuccess, true);
  assert.ok(record.assets.some(item => item.urlPath.endsWith(".html")));
  assert.ok(record.assets.some(item => item.urlPath.endsWith(".js")));
  record.status = "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW";
} catch (error) {
  record.status = "BUILD_FAILED_OR_INCOMPLETE";
  record.errors.push(error instanceof Error ? error.stack ?? String(error) : String(error));
  process.exitCode = 1;
} finally {
  await writeFile(path.join(proofDir, "build-proof.json"), JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
}
console.log(JSON.stringify({ status: record.status, proofDir }));
