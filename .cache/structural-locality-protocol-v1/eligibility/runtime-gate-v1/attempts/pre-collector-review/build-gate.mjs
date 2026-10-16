import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const stage = fileURLToPath(new URL("./", import.meta.url));
const root = path.resolve(stage, "../../../..");
const old = path.resolve(stage, "..");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const read = (file) => readFile(path.join(root, file));
const relative = (file) => path.relative(root, file).replaceAll(path.sep, "/");
const lock = JSON.parse(await readFile(path.join(stage, "input-lock.json")));
const report = { schemaVersion: "structural-runtime-gate-build-v1", status: "FAIL",
  inputLockSha256: sha(await readFile(path.join(stage, "input-lock.json"))),
  inputs: [], compiler: {}, artifacts: [], proof: {}, command: null, errors: [] };
async function exists(file) {
  try { await stat(file); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; }
}
for (const file of ["dist", "proof", "build-report.json", "vite.stdout.log", "vite.stderr.log"]) {
  if (await exists(path.join(stage, file))) throw new Error(`refusing prior runtime gate output ${file}`);
}
if (process.version !== "v24.18.0") throw new Error(`Node ${process.version} is not pinned v24.18.0`);
async function verify(phase) {
  for (const item of lock.inputs) {
    const actual = sha(await read(item.path));
    report.inputs.push({ phase, path: item.path, expected: item.sha256, actual });
    assert.equal(actual, item.sha256, `${phase}: ${item.path}`);
  }
}
async function walk(dir) {
  const result = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, item.name);
    if (item.isDirectory()) result.push(...await walk(target));
    else result.push(target);
  }
  return result;
}
try {
  await verify("before");
  const oldLock = await readFile(path.join(old, "input-lock.json"));
  const originalInputs = JSON.parse(oldLock).inputs;
  assert.equal(originalInputs.length, 413);
  for (const item of originalInputs) {
    assert.ok(lock.inputs.some((locked) => locked.path === item.path && locked.sha256 === item.sha256),
      `missing original source lock entry ${item.path}`);
  }
  const verified = JSON.parse(await readFile(path.join(old,
    "artifact-verifier-v1/verification-report.json")));
  const oldBuild = JSON.parse(await readFile(path.join(old, "build-gate-report.json")));
  assert.equal(sha(oldLock), "fe59755ce7b5949876cd43b3b17213a4bf9e0d296a6ba290db6fabbc1126ea09");
  assert.equal(verified.status, "CORRECTED_ARTIFACT_CHECK_PASS_BUILD_PROVENANCE_ONLY");
  assert.equal(verified.hashes.lock, sha(oldLock));
  const binary = path.join(old, "cargo-target/debug/ui-graph-compiler-spike");
  const binaryHash = sha(await readFile(binary));
  assert.equal(binaryHash, "74396ae694aa6203cc4d4b4900c3458ca31e25e9638c73160b51bcb4aede79c8");
  report.compiler = { binary: relative(binary), sha256: binaryHash,
    sourceRoot: root, oldLockSha256: sha(oldLock), oldVerificationStatus: verified.status };
  const vite = path.join(root, "node_modules/vite/bin/vite.js");
  const args = [vite, "build", "--config", path.join(stage, "vite.config.ts")];
  const stdout = []; const stderr = [];
  const child = spawn(process.execPath, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
  child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
  const exit = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  const out = Buffer.concat(stdout); const err = Buffer.concat(stderr);
  await writeFile(path.join(stage, "vite.stdout.log"), out, { flag: "wx" });
  await writeFile(path.join(stage, "vite.stderr.log"), err, { flag: "wx" });
  report.command = { executable: process.execPath, args, exit,
    stdoutSha256: sha(out), stderrSha256: sha(err) };
  assert.deepEqual(exit, { code: 0, signal: null }, "Vite build failed");
  const proofDir = path.join(stage, "proof");
  const proofNames = ["native_collection.tsx", "native_generic.tsx", "native_controller.tsx",
    "react_array.tsx", "react_controller.tsx"];
  for (const name of proofNames) {
    const code = await readFile(path.join(proofDir, `${name}.emitted.txt`), "utf8");
    report.proof[name] = { sha256: sha(Buffer.from(code)), bytes: Buffer.byteLength(code) };
    assert.ok(code.length > 100, `empty emitted ${name}`);
  }
  const collection = await readFile(path.join(proofDir, "native_collection.tsx.emitted.txt"), "utf8");
  const generic = await readFile(path.join(proofDir, "native_generic.tsx.emitted.txt"), "utf8");
  const react = await readFile(path.join(proofDir, "react_array.tsx.emitted.txt"), "utf8");
  for (const [name, earlier] of [["native_collection.tsx", oldBuild.proof.native],
    ["native_generic.tsx", oldBuild.proof.generic],
    ["react_array.tsx", oldBuild.proof.react]]) {
    assert.equal(report.proof[name].sha256, earlier.emittedSha256,
      `${name}: transformed source differs from corrected eligible build`);
  }
  const nativeSites = [oldBuild.proof.native.rowSite, oldBuild.proof.native.boardSite,
    ...oldBuild.proof.native.rowStateSites, ...oldBuild.proof.native.rowEffectSites,
    ...oldBuild.proof.native.collectionSites.map((site) => site.site_id)];
  const genericSites = [oldBuild.proof.generic.rowSite, oldBuild.proof.generic.boardSite,
    ...oldBuild.proof.generic.rowStateSites, ...oldBuild.proof.generic.rowEffectSites,
    ...oldBuild.proof.generic.boardStateSites];
  for (const site of nativeSites) assert.ok(collection.includes(site), `missing native site ${site}`);
  for (const site of genericSites) assert.ok(generic.includes(site), `missing generic site ${site}`);
  assert.equal(oldBuild.proof.native.collectionSites.length, 1);
  assert.equal(oldBuild.proof.native.collectionSites[0].requires_owner_render, false);
  assert.match(collection, /renderCollectionAt/);
  assert.match(collection, /useStateAt/);
  assert.match(collection, /useEffectAt/);
  assert.match(react, /\b_c\(8\)/);
  assert.match(react, /\b_c\(12\)/);
  report.proof.collectionStateEffectAndSite = { nativeSites, genericSites,
    compilerDeltaEligible: true, requiresOwnerRender: false };
  report.proof.reactCompilerMemo = { rowSlots: 8, boardSlots: 12,
    matchesCorrectedEligibleBuild: true };
  for (const file of await walk(path.join(stage, "dist"))) {
    report.artifacts.push({ path: relative(file), sha256: sha(await readFile(file)) });
  }
  report.artifacts.sort((a, b) => a.path.localeCompare(b.path));
  assert.ok(report.artifacts.some((item) => item.path.endsWith("/index.html")));
  assert.ok(report.artifacts.some((item) => item.path.endsWith(".js.map")));
  const js = report.artifacts.find((item) => item.path.endsWith(".js") && !item.path.endsWith(".js.map"));
  assert.ok(js, "missing bundle JS");
  const bundled = (await read(js.path)).toString("utf8");
  assert.match(bundled, /NativeCollectionBoard/);
  assert.match(bundled, /NativeGenericBoard/);
  assert.match(bundled, /ReactArrayBoard/);
  assert.match(bundled, /useMemoCache/);
  for (const site of [...nativeSites, ...genericSites])
    assert.ok(bundled.includes(site), `bundle missing native site ${site}`);
  const mapEntry = report.artifacts.find((item) => item.path === `${js.path}.map`);
  assert.ok(mapEntry, "bundle map missing");
  const map = JSON.parse((await read(mapEntry.path)).toString("utf8"));
  for (const fragment of ["native_collection.tsx", "native_generic.tsx",
    "native_controller.tsx", "react_array.tsx", "react_controller.tsx",
    "jsx_binding_runtime", "compiler-runtime"]) {
    assert.ok(map.sources.some((source) => source.includes(fragment)),
      `bundle map missing ${fragment}`);
  }
  report.proof.bundle = { path: js.path, sha256: js.sha256,
    compilerAndNativeFixtureIdentifiers: true };
  report.status = "BUILD_PROVENANCE_PASS_RUNTIME_UNVERIFIED";
} catch (error) { report.errors.push(String(error?.stack ?? error)); }
finally {
  try { await verify("after"); } catch (error) { report.errors.push(String(error)); report.status = "FAIL"; }
  await writeFile(path.join(stage, "build-report.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
}
if (report.status !== "BUILD_PROVENANCE_PASS_RUNTIME_UNVERIFIED") process.exitCode = 1;
