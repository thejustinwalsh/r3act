import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const stage = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(stage, "../../..");
const args = process.argv.slice(2);
assert.deepEqual(args.slice(0, 1), ["--proof-dir"]);
assert.ok(args[1] && args.length === 2, "usage: node run-once.mjs --proof-dir APPROVED_PROOF_DIR");
const proofDir = path.resolve(args[1]);
assert.equal(path.dirname(proofDir), stage);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (filename) => sha(await readFile(filename));
const proofBytes = await readFile(path.join(proofDir, "build-proof.json"));
const proof = JSON.parse(proofBytes);
const approvalBytes = await readFile(path.join(proofDir, "run-authorization.json"));
const approval = JSON.parse(approvalBytes);
assert.equal(proof.status, "BUILD_CAPTURED_PENDING_PRIMARY_REVIEW");
assert.equal(approval.status, "APPROVED_FOR_ONE_DESCRIPTIVE_PAIR");
assert.equal(approval.buildProofSha256, sha(proofBytes));
assert.equal(process.version, proof.node);
assert.equal(process.execPath, proof.nodeExecutable);
assert.equal(await hashFile(process.execPath), proof.nodeExecutableSha256);
assert.ok(Object.values(proof.assertions).every(Boolean));
const receiptPath = path.join(proofDir, "pair-one-shot.json");
const receipt = { schemaVersion: 1, status: "STARTED", order: ["native", "react"],
  meaning: "One fresh Node process per installed Vite lib build, spawn to exit; includes plugin and compiler startup, binary manifest/hash checks and bundling, excludes untimed package setup and proof checks",
  limitations: "Required untimed proof builds and pre-pair hashes may prime OS/filesystem caches; fresh processes only, no cold-cache/compiler qualification or additional warmup iterations. Fixed native-first order; no retry, sample filtering, server or browser; not runtime latency, independent-device evidence or broad performance qualification",
  node: process.version, buildProofSha256: sha(proofBytes), sourceBefore: [], sourceAfter: [],
  deadlineMs: 90_000, arms: [], errors: [], stopReason: null, totalBuildPairMs: null };
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
const consumer = path.join(proofDir, "consumer");
const verify = async (field) => {
  const inputs = [
    ...proof.sources.map((item) => ({ path: path.join(root, item.path), expected: item.sha256 })),
    ...proof.tarballs.map((item) => ({ path: path.join(root, item.file), expected: item.sha256 })),
    ...proof.consumerInputs.map((item) => ({ path: path.join(proofDir, item.path), expected: item.sha256 })),
    ...proof.reviewAssets.map((item) => ({ path: path.join(proofDir, item.path), expected: item.sha256 })),
    { path: path.join(proofDir, proof.compiler.path), expected: proof.compiler.sha256 },
    { path: path.join(consumer, "node_modules/@r3act/vite/dist/compiler/bin/manifest.json"),
      expected: proof.compiler.manifestSha256 },
    { path: path.join(proofDir, "source-lock.json"), expected: proof.sourceLockSha256 },
    { path: path.join(proofDir, "build-proof.json"), expected: sha(proofBytes) },
    { path: path.join(proofDir, "run-authorization.json"), expected: sha(approvalBytes) },
    { path: process.execPath, expected: proof.nodeExecutableSha256 },
  ];
  for (const item of inputs) {
    const actual = await hashFile(item.path);
    receipt[field].push({ path: item.path, sha256: actual, matches: actual === item.expected });
    assert.equal(actual, item.expected, `${field} drift: ${item.path}`);
  }
};
const assets = async (directory) => {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await assets(filename));
    else found.push({ path: path.relative(proofDir, filename).split(path.sep).join("/"),
      bytes: (await stat(filename)).size, sha256: await hashFile(filename) });
  }
  return found.sort((a, b) => a.path.localeCompare(b.path));
};
let currentChild;
let activeGroupPid;
let stopped = false;
const killGroup = (pid) => {
  try { process.kill(-pid, "SIGKILL"); }
  catch (error) { if (error?.code !== "ESRCH") throw error; }
};
const stop = (reason) => {
  if (stopped) return;
  stopped = true;
  receipt.stopReason = reason;
  if (activeGroupPid) {
    try { killGroup(activeGroupPid); } catch { currentChild?.kill("SIGKILL"); }
  } else if (currentChild) {
    currentChild.kill("SIGKILL");
  }
};
const interrupt = () => stop("SIGINT");
const terminate = () => stop("SIGTERM");
process.on("SIGINT", interrupt);
process.on("SIGTERM", terminate);
let timer;
const timedBuild = async (arm, deadline) => {
  assert.equal(stopped, false, `build pair interrupted: ${receipt.stopReason}`);
  const output = path.join(proofDir, "timed", arm);
  const start = performance.now();
  const child = spawn(process.execPath, [path.join(consumer, "build-arm.mjs"), arm, output], {
    cwd: consumer, detached: true, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env,
      PATH: `${path.join(consumer, "blocked-tools")}${path.delimiter}${process.env.PATH ?? ""}` },
  });
  currentChild = child;
  activeGroupPid = child.pid;
  const stdout = []; const stderr = [];
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  const result = await new Promise((resolve) => {
    let error = null;
    child.once("error", (cause) => { error = String(cause); });
    child.once("close", (code, signal) => resolve({ code, signal, error }));
  });
  const elapsedMs = performance.now() - start;
  if (activeGroupPid) killGroup(activeGroupPid);
  activeGroupPid = undefined;
  currentChild = undefined;
  const stdoutFile = path.join(proofDir, `timed-${arm}.stdout.log`);
  const stderrFile = path.join(proofDir, `timed-${arm}.stderr.log`);
  await writeFile(stdoutFile, Buffer.concat(stdout), { flag: "wx" });
  await writeFile(stderrFile, Buffer.concat(stderr), { flag: "wx" });
  const armReceipt = { arm, elapsedMs, exit: result.code, signal: result.signal, error: result.error,
    assets: await assets(output).catch(() => []), transformMatchesReview: false };
  receipt.arms.push(armReceipt);
  assert.ok(!stopped && performance.now() <= deadline, `build pair interrupted: ${receipt.stopReason ?? "deadline"}`);
  assert.equal(result.code, 0, `${arm} Vite build failed; see ${stderrFile}`);
  const actual = await hashFile(path.join(output, "post-transform.js"));
  const expected = proof.reviewAssets.find((item) => item.path === `review/${arm}/post-transform.js`)?.sha256;
  armReceipt.transformMatchesReview = actual === expected;
  assert.ok(armReceipt.transformMatchesReview, `${arm} post-compiler transform changed since untimed review`);
  assert.ok(armReceipt.assets.some((item) => item.path.endsWith(".js") && item.bytes > 0),
    `${arm} emitted no JavaScript bundle`);
};
try {
  assert.notEqual(process.platform, "win32", "timed pair requires POSIX process-group cleanup");
  const sourceLock = JSON.parse(await readFile(path.join(proofDir, "source-lock.json")));
  assert.deepEqual(sourceLock.sources, proof.sources);
  assert.deepEqual(sourceLock.tarballs, proof.tarballs);
  assert.equal(sourceLock.compiler.sha256, proof.compiler.sha256);
  assert.equal(sourceLock.compiler.manifestSha256, proof.compiler.manifestSha256);
  await verify("sourceBefore");
  assert.equal(await hashFile(path.join(root, ".cache/r3act-package-build/report.json")), proof.packageReportSha256);
  assert.equal(stopped, false, `build pair interrupted: ${receipt.stopReason}`);
  const pairStart = performance.now();
  const deadline = pairStart + 90_000;
  timer = setTimeout(() => stop("90-second build-pair deadline"), 90_000);
  await timedBuild("native", deadline);
  await timedBuild("react", deadline);
  receipt.totalBuildPairMs = performance.now() - pairStart;
  clearTimeout(timer);
  await verify("sourceAfter");
  assert.equal(await hashFile(path.join(root, ".cache/r3act-package-build/report.json")), proof.packageReportSha256);
  receipt.status = "PASS_DESCRIPTIVE_BUILD_PAIR_ONLY";
} catch (error) {
  stop(receipt.stopReason ?? "failure");
  receipt.status = "INCOMPLETE";
  receipt.errors.push(String(error?.stack ?? error));
  throw error;
} finally {
  clearTimeout(timer);
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", terminate);
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
}
