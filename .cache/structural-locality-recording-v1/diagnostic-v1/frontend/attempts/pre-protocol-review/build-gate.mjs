import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyReactCompilerAst } from "./react-ast-proof.mjs";
import { REQUIRED_COUNT_SITES } from "./receipt-analyzer.mjs";

const stage = fileURLToPath(new URL("./", import.meta.url));
const root = path.resolve(stage, "../../../..");
const eligibility = path.join(root, ".cache/structural-locality-protocol-v1/eligibility");
const old = path.join(eligibility, "runtime-gate-v2");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const relative = (file) => path.relative(root, file).replaceAll(path.sep, "/");
const lockBytes = await readFile(path.join(stage, "input-lock.json"));
const lock = JSON.parse(lockBytes);
assert.equal(process.version, "v24.18.0");
assert.equal(lock.schemaVersion, "structural-diagnostic-frontend-input-lock-v1");
const report = { schemaVersion: "structural-diagnostic-frontend-build-v1", status: "FAIL",
  inputLockSha256: sha(lockBytes), sourceAudits: [], binary: null, command: null,
  hook: null, proof: {}, artifacts: [], errors: [], originalBuildError: null };
const exists = async (file) => { try { await stat(file); return true; }
  catch (error) { if (error.code === "ENOENT") return false; throw error; } };
for (const name of ["dist", "proof", "build-report.json", "vite.stdout.log", "vite.stderr.log"])
  if (await exists(path.join(stage, name))) throw Error(`refusing prior output ${name}`);
async function verify(phase) {
  const mismatches = [];
  for (const item of lock.inputs) {
    let actual;
    try { actual = sha(await readFile(path.join(root, item.path))); }
    catch (error) { actual = `READ_ERROR:${String(error)}`; }
    report.sourceAudits.push({ phase, path: item.path, expected: item.sha256, actual });
    if (actual !== item.sha256) mismatches.push(item.path);
  }
  assert.deepEqual(mismatches, [], `${phase}: input drift`);
}
async function walk(dir) {
  const files = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, item.name);
    if (item.isDirectory()) files.push(...await walk(target)); else files.push(target);
  }
  return files;
}
try {
  await verify("before");
  const v2LockBytes = await readFile(path.join(old, "input-lock.json"));
  const v2Lock = JSON.parse(v2LockBytes);
  assert.equal(v2Lock.inputs.length, 424);
  assert.equal(sha(v2LockBytes), lock.eligibilityInputLockSha256);
  for (const item of v2Lock.inputs)
    assert.ok(lock.inputs.some((entry) => entry.path === item.path && entry.sha256 === item.sha256),
      `missing eligible input ${item.path}`);
  const v2ReportBytes = await readFile(path.join(old, "build-report.json"));
  assert.equal(sha(v2ReportBytes), lock.eligibilityBuildReportSha256);
  const v2Report = JSON.parse(v2ReportBytes);
  assert.equal(v2Report.status, "BUILD_PROVENANCE_PASS_RUNTIME_UNVERIFIED");
  const binary = path.join(eligibility, "cargo-target/debug/ui-graph-compiler-spike");
  const binaryHash = sha(await readFile(binary));
  assert.equal(binaryHash, "74396ae694aa6203cc4d4b4900c3458ca31e25e9638c73160b51bcb4aede79c8");
  report.binary = { path: relative(binary), sha256: binaryHash,
    compilerSourceLockSha256: lock.eligibilityInputLockSha256 };
  const coverageBytes = await readFile(path.join(stage, "../counter-coverage.json"));
  const coverage = JSON.parse(coverageBytes);
  assert.equal(coverage.schemaVersion, "recording-b-probe-coverage-v1");
  report.proof.counterCoverage = { sha256: sha(coverageBytes),
    schemaVersion: coverage.schemaVersion, namedSites: Object.keys(coverage.counts).length };
  for (const [name, authority] of Object.entries(REQUIRED_COUNT_SITES)) {
    assert.deepEqual(coverage.counts[name], authority, `coverage registry drift ${name}`);
    const source = await readFile(path.join(stage, "../snapshot/src",
      name === "root.flush.entries" ? "structural_count_probe.ts" :
        authority.site.split(":", 1)[0]), "utf8");
    assert.ok(source.includes(`structuralCount("${name}"`),
      `required route count source absent: ${name}`);
  }
  report.proof.requiredRouteSites = REQUIRED_COUNT_SITES;
  const vite = path.join(root, "node_modules/vite/bin/vite.js");
  const args = [vite, "build", "--config", path.join(stage, "vite.config.ts")];
  const stdout = [], stderr = [];
  const child = spawn(process.execPath, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
  child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
  const exit = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  const out = Buffer.concat(stdout), err = Buffer.concat(stderr);
  await writeFile(path.join(stage, "vite.stdout.log"), out, { flag: "wx" });
  await writeFile(path.join(stage, "vite.stderr.log"), err, { flag: "wx" });
  report.command = { executable: process.execPath, args, exit,
    stdoutSha256: sha(out), stderrSha256: sha(err) };
  const proofDir = path.join(stage, "proof");
  const hookPath = path.join(proofDir, "hook-report.json");
  if (await exists(hookPath)) report.hook = JSON.parse(await readFile(hookPath, "utf8"));
  const originalPath = path.join(proofDir, "original-build-error.json");
  if (await exists(originalPath)) report.originalBuildError = {
    sha256: sha(await readFile(originalPath)), diagnostic: JSON.parse(await readFile(originalPath, "utf8")) };
  if (exit.code !== 0 || exit.signal !== null)
    throw Error(`Vite failed: ${JSON.stringify({ exit, hook: report.hook, original: report.originalBuildError })}`);
  assert.ok(report.hook);
  assert.deepEqual(report.hook.buildEndErrors, []);
  assert.deepEqual(report.hook.closeBundleErrors, []);
  assert.deepEqual(report.hook.captureErrors, []);
  for (const name of ["native_collection.tsx", "native_generic.tsx", "native_controller.tsx",
    "react_array.tsx", "entry.ts"]) {
    const bytes = await readFile(path.join(proofDir, `${name}.emitted.txt`));
    report.proof[name] = { sha256: sha(bytes), bytes: bytes.length };
    assert.ok(bytes.length > 100);
    assert.ok(report.hook.captures.some((item) => item.name === name && item.sha256 === sha(bytes)));
  }
  assert.equal(report.proof["native_collection.tsx"].sha256,
    v2Report.proof["native_collection.tsx"].sha256);
  assert.equal(report.proof["native_generic.tsx"].sha256,
    v2Report.proof["native_generic.tsx"].sha256);
  assert.equal(report.proof["react_array.tsx"].sha256,
    v2Report.proof["react_array.tsx"].sha256);
  const controller = await readFile(path.join(proofDir, "native_controller.tsx.emitted.txt"), "utf8");
  assert.match(controller, /__nativeDefineComponent/);
  assert.match(controller, /__nativeJsx\.jsx/);
  for (const site of ["NativeCollectionMount", "NativeGenericMount"])
    assert.ok(controller.includes(`#component:${site}`), `missing controller component ${site}`);
  const native = await readFile(path.join(proofDir, "native_collection.tsx.emitted.txt"), "utf8");
  for (const id of v2Report.proof.collectionStateEffectAndSite.nativeSites)
    assert.ok(native.includes(id), `missing native site ${id}`);
  const react = await readFile(path.join(proofDir, "react_array.tsx.emitted.txt"), "utf8");
  assert.match(react, /\b_c\(8\)/);
  assert.match(react, /\b_c\(12\)/);
  for (const file of await walk(path.join(stage, "dist")))
    report.artifacts.push({ path: relative(file), sha256: sha(await readFile(file)) });
  report.artifacts.sort((a, b) => a.path.localeCompare(b.path));
  assert.equal(report.artifacts.filter((item) => item.path.endsWith(".html")).length, 1);
  const js = report.artifacts.filter((item) => item.path.endsWith(".js"));
  assert.equal(js.length, 1);
  const bundle = await readFile(path.join(root, js[0].path), "utf8");
  report.proof.reactCompilerAst = verifyReactCompilerAst(bundle, react, root);
  for (const token of ["NativeCollectionBoard", "NativeGenericBoard", "ReactArrayBoard",
    "beginStructuralCountWindow", "endStructuralCountWindow", "useMemoCache"])
    assert.ok(bundle.includes(token), `bundle missing ${token}`);
  const mapEntry = report.artifacts.find((item) => item.path === `${js[0].path}.map`);
  assert.ok(mapEntry);
  const map = JSON.parse(await readFile(path.join(root, mapEntry.path), "utf8"));
  for (const token of ["native_collection.tsx", "native_generic.tsx", "native_controller.tsx",
    "react_array.tsx", "entry.ts", "snapshot/src/structural_count_probe.ts",
    "snapshot/src/native_runtime_api.ts", "snapshot/src/jsx_binding_runtime.ts",
    "snapshot/src/vdom_snapshot_runtime.ts", "compiler-runtime"])
    assert.ok(map.sources.some((source) => source.includes(token)), `map missing ${token}`);
  for (const source of map.sources)
    if (source.includes("/src/") && !source.includes("/snapshot/src/") &&
        !source.includes("node_modules")) throw Error(`live src in map: ${source}`);
  report.status = "BUILD_PROVENANCE_PASS_PAGE_UNVERIFIED";
} catch (error) { report.errors.push(String(error?.stack ?? error)); }
finally {
  try { await verify("after"); } catch (error) { report.errors.push(String(error)); report.status = "FAIL"; }
  try {
    const after = sha(await readFile(path.join(eligibility,
      "cargo-target/debug/ui-graph-compiler-spike")));
    if (after !== "74396ae694aa6203cc4d4b4900c3458ca31e25e9638c73160b51bcb4aede79c8")
      throw Error("compiler binary changed");
  } catch (error) { report.errors.push(String(error)); report.status = "FAIL"; }
  await writeFile(path.join(stage, "build-report.json"), JSON.stringify(report, null, 2) + "\n",
    { flag: "wx" });
}
if (report.status !== "BUILD_PROVENANCE_PASS_PAGE_UNVERIFIED") process.exitCode = 1;
