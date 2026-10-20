import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, "../..");
const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
assert.ok(args.includes("--proof-dir"),
  "usage: node run-build-pair.mjs --proof-dir DIR --phase proof|measure");
const proof = path.resolve(root, option("--proof-dir"));
assert.ok(proof.startsWith(`${unit}${path.sep}`));
const phase = args.includes("--phase") ? option("--phase") : "proof";
assert.ok(["proof", "measure"].includes(phase));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const hash = async file => sha(await readFile(file));
const buildProofBytes = await readFile(path.join(proof, "build-proof.json"));
const buildProof = JSON.parse(buildProofBytes);
assert.equal(buildProof.status, "PASS_INSTALLED_BUILD_PROOF");
const consumer = buildProof.consumer;
assert.equal(path.dirname(consumer), await realpath(tmpdir()));
assert.ok(path.basename(consumer).startsWith("r3act-portable-source-"));
const lockBytes = await readFile(path.join(proof, "input-lock.json"));
const lock = JSON.parse(lockBytes);
let authorization, proofPair;
if (phase === "measure") {
  const pairBytes = await readFile(path.join(proof, "pair-proof.json"));
  proofPair = JSON.parse(pairBytes);
  assert.equal(proofPair.status, "PASS_UNTIMED_BUILD_PAIR");
  const browserBytes = await readFile(path.join(proof, "browser-untimed.json"));
  const browserProof = JSON.parse(browserBytes);
  assert.equal(browserProof.status, "PASS_UNTIMED_BROWSER");
  assert.equal(browserProof.buildProofSha256, sha(buildProofBytes));
  assert.equal(browserProof.pairProofSha256, sha(pairBytes));
  authorization = JSON.parse(await readFile(path.join(proof, "run-authorization.json"), "utf8"));
  assert.equal(authorization.status, "APPROVED_FOR_ONE_BUILD_PAIR");
  assert.equal(authorization.buildProofSha256, sha(buildProofBytes));
  assert.equal(authorization.inputLockSha256, sha(lockBytes));
  assert.equal(authorization.pairProofSha256, sha(pairBytes));
  assert.equal(authorization.browserUntimedSha256, sha(browserBytes));
}
const verify = async () => {
  const rows = [];
  assert.equal(lock.packageReport.sourcePath,
    path.join(root, ".cache/r3act-package-build/report.json"));
  assert.equal(lock.packageReport.path, path.join(proof, "inputs", "package-report.json"));
  const reportBytes = await readFile(lock.packageReport.path);
  assert.equal(sha(reportBytes), lock.packageReport.sha256);
  assert.equal(await hash(lock.packageReport.sourcePath), lock.packageReport.sha256);
  assert.equal(lock.stagedSource.schemaVersion, 1);
  for (const item of lock.stagedSource.files) {
    assert.equal(await hash(path.join(root, item.path)), item.sha256);
    assert.equal(await hash(path.join(proof, "inputs", "native-source", item.path)), item.sha256);
  }
  const report = JSON.parse(reportBytes);
  for (const [relative, expected] of Object.entries(report.sourceHashes ?? {}))
    assert.equal(await hash(path.join(root, relative)), expected,
      `changed package source: ${relative}`);
  for (const item of lock.source) {
    const current = await hash(path.join(unit, item.relative));
    const archived = await hash(path.join(proof, "inputs", "source", item.relative));
    assert.equal(current, item.sha256);
    assert.equal(archived, item.sha256);
    if (item.relative.startsWith("consumer/") && item.relative !== "consumer/package.json") assert.equal(
      await hash(path.join(consumer, item.relative.slice("consumer/".length))), item.sha256);
    rows.push({ path: item.relative, sha256: current });
  }
  for (const item of lock.externalSource) {
    assert.equal(await hash(path.join(root, item.relative)), item.sha256);
    assert.equal(await hash(item.path), item.sha256);
    rows.push({ path: item.relative, sha256: item.sha256 });
  }
  for (const item of lock.tarballs) assert.equal(await hash(item.path), item.sha256);
  for (const item of lock.installed) {
    assert.equal(await hash(item.path), item.sha256);
    if (item.installedPath) assert.equal(await hash(item.installedPath), item.sha256);
  }
  assert.equal(await hash(lock.compiler.path), lock.compiler.sha256);
  assert.equal(await hash(lock.compiler.installedPath), lock.compiler.sha256);
  for (const item of buildProof.transforms) assert.equal(await hash(item.path), item.sha256);
  for (const item of buildProof.assets) assert.equal(await hash(item.path), item.sha256);
  return rows;
};
const scan = async directory => {
  const rows = [];
  const walk = async dir => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile()) rows.push({ path: path.relative(directory, file).replaceAll(path.sep, "/"),
        sha256: await hash(file), bytes: (await stat(file)).size });
    }
  };
  await walk(directory);
  return rows.sort((a, b) => a.path.localeCompare(b.path));
};
const run = async mode => {
  const output = path.join(proof, phase === "proof" ? "comparison-proof" : "comparison-one-pair");
  const argv = ["comparison/build.mjs", mode, output];
  const startedNs = process.hrtime.bigint();
  const child = spawn(process.execPath, argv, { cwd: consumer, detached: true,
    stdio: ["ignore", "pipe", "pipe"] });
  const stdout = [], stderr = [];
  child.stdout.on("data", chunk => stdout.push(chunk));
  child.stderr.on("data", chunk => stderr.push(chunk));
  let stopReason = null, spawnError = null, signal = null;
  const stop = reason => {
    stopReason ??= reason;
    if (child.pid) try { process.kill(-child.pid, "SIGKILL"); } catch {}
  };
  const interrupt = () => stop("signal");
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  const timer = setTimeout(() => stop("deadline-90s"), 90_000);
  let closeTimer, endedNs;
  const exit = await new Promise(resolve => {
    let settled = false;
    const finish = code => { if (!settled) { settled = true; endedNs = process.hrtime.bigint(); resolve(code); } };
    child.once("error", error => { spawnError = String(error); finish(127); });
    child.once("close", (code, exitSignal) => { signal = exitSignal; finish(code ?? 1); });
    closeTimer = setTimeout(() => { stop("post-kill-close-timeout"); finish(124); }, 95_000);
  });
  clearTimeout(timer);
  clearTimeout(closeTimer);
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", interrupt);
  await writeFile(path.join(proof, `comparison-${phase}-${mode}.stdout.log`), Buffer.concat(stdout), { flag: "wx" });
  await writeFile(path.join(proof, `comparison-${phase}-${mode}.stderr.log`), Buffer.concat(stderr), { flag: "wx" });
  return { mode, command: process.execPath, argv, exit, signal, stopReason, spawnError,
    elapsedMs: phase === "measure" ? Number(endedNs - startedNs) / 1e6 : null };
};

const receiptPath = path.join(proof, phase === "proof" ? "pair-proof.json" : "build-one-pair.json");
const receipt = { phase, status: "STARTED", buildProofSha256: sha(buildProofBytes),
  inputLockSha256: sha(lockBytes), ...(authorization ? { authorization } : {}),
  inputBefore: [], inputAfter: [], builds: [], transforms: {}, assets: {}, metadata: {}, errors: [] };
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
try {
  receipt.inputBefore = await verify();
  const output = path.join(proof, phase === "proof" ? "comparison-proof" : "comparison-one-pair");
  for (const mode of ["native", "react"]) {
    const built = await run(mode);
    receipt.builds.push(built);
    assert.equal(built.exit, 0, `${mode} build failed`);
    assert.equal(built.stopReason, null, `${mode} build interrupted`);
    receipt.transforms[mode] = await scan(path.join(output, "transforms", mode));
    receipt.assets[mode] = await scan(path.join(output, "dist", mode));
    const metadata = JSON.parse(await readFile(path.join(output,
      `build-${mode}-transforms.json`), "utf8"));
    receipt.metadata[mode] = metadata;
    if (mode === "native") {
      const main = await readFile(path.join(output, "transforms", mode,
        "main.tsx.js"), "utf8");
      const scene = await readFile(path.join(output, "transforms", mode,
        "scene.tsx.js"), "utf8");
      const owners = new Set();
      const visit = node => {
        if (!node || typeof node !== "object") return;
        if (node.type === "CallExpression" && /^__nativeDefineComponent_*$/.test(node.callee?.name ?? "")) {
          const name = node.arguments[0]?.value?.split("#component:")[1];
          if (name) owners.add(name);
        }
        for (const [key, child] of Object.entries(node)) {
          if (["loc", "start", "end", "extra", "comments"].includes(key)) continue;
          if (Array.isArray(child)) child.forEach(visit);
          else if (child && typeof child === "object") visit(child);
        }
      };
      visit(parse(main, { sourceType: "module", plugins: ["typescript", "jsx"] }));
      visit(parse(scene, { sourceType: "module", plugins: ["typescript", "jsx"] }));
      for (const name of ["App", "Row", "ActiveMesh", "SceneApp"])
        assert.ok(owners.has(name), `${name} installed Native owner missing`);
      assert.match(main, /data-scalar/);
      assert.match(main, /__nativeRenderCollectionAt/);
      assert.match(scene, /position/);
      assert.match(scene, /rotation/);
      receipt.metadata.native.owners = [...owners].sort();
    } else {
      const transformed = await readFile(path.join(output, "transforms", mode,
        "comparison", "react", "react.tsx.js"), "utf8");
      assert.match(transformed, /react\/compiler-runtime/);
      assert.match(transformed, /function Hot\([^)]*\) \{\s*const \$ = _c\(\d+\);/,
        "measured React Hot lacks its compiler memo cache");
      assert.match(transformed, /from ["']react\/jsx-runtime["']/);
      assert.doesNotMatch(transformed, /["']@r3act\/core\/jsx-runtime["']/);
      assert.ok(metadata.compilerEvents.some(item =>
        item.kind === "CompileSuccess" && item.fnName === "Hot"),
        "React Compiler did not report CompileSuccess for measured Hot");
    }
    assert.ok(receipt.assets[mode].some(item => item.path === "index.html"));
    assert.ok(receipt.assets[mode].some(item => item.path.endsWith(".js")));
  }
  receipt.inputAfter = await verify();
  assert.deepEqual(receipt.inputAfter, receipt.inputBefore);
  if (phase === "measure") {
    assert.deepEqual(receipt.inputBefore, proofPair.inputBefore);
    assert.deepEqual(receipt.inputAfter, proofPair.inputAfter);
    assert.deepEqual(receipt.transforms, proofPair.transforms);
    assert.deepEqual(receipt.assets, proofPair.assets);
    assert.deepEqual(receipt.metadata, proofPair.metadata);
  }
  receipt.status = phase === "proof" ? "PASS_UNTIMED_BUILD_PAIR" : "PASS_ONE_BUILD_PAIR";
} catch (error) {
  receipt.status = "FAIL_OR_INCOMPLETE";
  receipt.errors.push(error instanceof Error ? error.stack ?? String(error) : String(error));
} finally {
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
}
if (receipt.status === "FAIL_OR_INCOMPLETE") {
  console.error(receipt.errors.join("\n"));
  process.exitCode = 1;
} else console.log(JSON.stringify({ status: receipt.status, receiptPath }));
