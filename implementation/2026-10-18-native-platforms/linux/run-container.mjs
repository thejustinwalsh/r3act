import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { stageNativeVerificationSource } from "../../../scripts/native_verification_inputs.mjs";

const [phase] = process.argv.slice(2);
assert.ok(["bootstrap", "verify", "benchmark-prepare", "benchmark-run", "archive"].includes(phase));
const source = "/source";
const workspace = "/workspace/r3act";
const evidence = "/evidence";
const benchmark = "implementation/2026-10-18-native-platforms/benchmark";
const proof = path.join(workspace, benchmark, "proof-v1");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const receiptPath = path.join(evidence, "phases", `${phase}.json`);
await mkdir(path.dirname(receiptPath), { recursive: true });
const receipt = { schemaVersion: 1, phase, status: "STARTED",
  sourceCommit: process.env.R3ACT_SOURCE_COMMIT ?? null, exit: null, error: null };
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
const runNode = async (args) => {
  const child = spawn(process.execPath, args, { cwd: workspace, env: process.env, stdio: "inherit" });
  const result = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  receipt.exit = result;
  assert.equal(result.code, 0, `phase ${phase} failed: ${JSON.stringify(result)}`);
};
const validateCopiedSource = async () => {
  const lock = JSON.parse(await readFile(path.join(evidence, "container-source-lock.json")));
  assert.equal(lock.sourceCommit, receipt.sourceCommit);
  assert.ok(lock.files.some((file) => file.path ===
    "implementation/2026-10-18-native-platforms/linux/run-container.mjs"));
  for (const file of lock.files) {
    assert.equal(hash(await readFile(path.join(workspace, file.path))), file.sha256,
      `copied source changed: ${file.path}`);
  }
  const control = lock.files.find((file) => file.path ===
    "implementation/2026-10-18-native-platforms/linux/run-container.mjs");
  assert.equal(hash(await readFile(path.join(source, control.path))), control.sha256,
    "executed host control differs from copied source lock");
  const helper = lock.files.find((file) => file.path === "scripts/native_verification_inputs.mjs");
  assert.ok(helper, "source lock must contain the shared staging helper");
  assert.equal(hash(await readFile(path.join(source, helper.path))), helper.sha256,
    "host staging helper differs from copied source lock");
};
const runAndMirror = async (args) => {
  let primaryError;
  try { await runNode(args); }
  catch (error) { primaryError = error; }
  try { await mirrorProof(); }
  catch (error) {
    if (!primaryError) throw error;
    receipt.mirrorError = String(error?.stack ?? error);
  }
  if (primaryError) throw primaryError;
};
const mirrorProof = async () => {
  try { await stat(proof); }
  catch (error) { if (error?.code === "ENOENT") return; throw error; }
  const destination = path.join(evidence, "benchmark", "proof-v1");
  const copyTree = async (from, to, relative = "") => {
    await mkdir(to, { recursive: true });
    for (const entry of await readdir(from, { withFileTypes: true })) {
      const child = path.posix.join(relative, entry.name);
      if (child === "consumer/node_modules") continue;
      const sourceFile = path.join(from, entry.name);
      const targetFile = path.join(to, entry.name);
      if (entry.isDirectory()) await copyTree(sourceFile, targetFile, child);
      else if (entry.isFile()) await copyFile(sourceFile, targetFile);
      else throw new Error(`Unsupported proof entry: ${child}`);
    }
  };
  await copyTree(proof, destination);
  let buildProofBytes;
  try { buildProofBytes = await readFile(path.join(proof, "build-proof.json")); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
  if (!buildProofBytes) return;
  const buildProof = JSON.parse(buildProofBytes);
  const compiler = buildProof.compiler.path;
  assert.ok(compiler.startsWith("consumer/node_modules/@r3act/vite/dist/compiler/bin/"));
  for (const relative of [compiler,
    "consumer/node_modules/@r3act/vite/dist/compiler/bin/manifest.json"]) {
    const target = path.join(destination, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(proof, relative), target);
  }
  const copied = await readFile(path.join(destination, "build-proof.json"));
  assert.equal(hash(copied), hash(buildProofBytes));
};
try {
  assert.match(receipt.sourceCommit ?? "", /^[a-f0-9]{40}$/);
  assert.equal(process.platform, "linux");
  assert.equal(process.arch, "arm64");
  if (phase === "bootstrap") {
    assert.ok((await readdir("/workspace")).every((name) => name === "lost+found"),
      "owned workspace volume must contain no prior project files");
    const { files } = await stageNativeVerificationSource(source, workspace);
    const lockBytes = Buffer.from(JSON.stringify({
      schemaVersion: 1, sourceCommit: receipt.sourceCommit, files,
    }, null, 2) + "\n");
    await writeFile(path.join(evidence, "container-source-lock.json"), lockBytes, { flag: "wx" });
    receipt.sourceCount = files.length;
    receipt.sourceLockSha256 = hash(lockBytes);
    for (const file of files) {
      assert.equal(hash(await readFile(path.join(source, file.path))), file.sha256,
        `source changed during bootstrap: ${file.path}`);
    }
    await runNode([path.join(workspace,
      "implementation/2026-10-18-native-platforms/linux/bootstrap-tools.mjs")]);
  } else if (phase === "verify") {
    await validateCopiedSource();
    await runNode(["scripts/verify_native_platform.mjs", "--output-dir",
      path.join(evidence, "runner"), "--expected-platform", "linux",
      "--expected-arch", "arm64", "--execution-kind", "linux-vm"]);
  } else if (phase === "benchmark-prepare") {
    await validateCopiedSource();
    await runAndMirror([path.join(workspace, benchmark, "prepare.mjs"), "--proof-dir", proof]);
  } else if (phase === "archive") {
    await validateCopiedSource();
    await mirrorProof();
  } else {
    await validateCopiedSource();
    const hostProof = path.join(evidence, "benchmark", "proof-v1");
    const approval = await readFile(path.join(hostProof, "run-authorization.json"));
    const reviewedBuild = await readFile(path.join(hostProof, "build-proof.json"));
    const workspaceBuild = await readFile(path.join(proof, "build-proof.json"));
    assert.equal(hash(reviewedBuild), hash(workspaceBuild), "reviewed proof differs from workspace");
    assert.equal(JSON.parse(approval).buildProofSha256, hash(workspaceBuild));
    await writeFile(path.join(proof, "run-authorization.json"), approval, { flag: "wx" });
    await runAndMirror([path.join(workspace, benchmark, "run-once.mjs"), "--proof-dir", proof]);
  }
  receipt.status = "PASS";
} catch (error) {
  receipt.status = "FAIL";
  receipt.error = String(error?.stack ?? error);
  throw error;
} finally {
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
}
