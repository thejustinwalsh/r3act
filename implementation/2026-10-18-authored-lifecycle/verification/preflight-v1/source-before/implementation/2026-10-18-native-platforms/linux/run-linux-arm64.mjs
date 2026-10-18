import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const stage = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(stage, "../../..");
const args = process.argv.slice(2);
assert.equal(args.length, 6);
assert.deepEqual([args[0], args[2], args[4]], ["--image-proof", "--evidence-dir", "--phase"]);
const imageProofPath = path.resolve(args[1]);
const evidence = path.resolve(args[3]);
const phase = args[5];
assert.ok(["bootstrap", "verify", "benchmark-prepare", "benchmark-run", "archive", "finalize"].includes(phase));
assert.equal(path.dirname(evidence), stage);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const proofBytes = await readFile(imageProofPath);
const image = JSON.parse(proofBytes);
assert.equal(image.status, "BASE_IDENTITY_CAPTURED");
assert.equal(image.platform, "linux/arm64");
const containerCommand = process.env.R3ACT_CONTAINER_COMMAND ?? "/Users/mini/.local/bin/container";
assert.equal(containerCommand, image.containerCommand);
const containerEnv = { ...process.env, CONTAINER_APP_ROOT: "/Volumes/Depot/Containers/apple/data" };
assert.equal(containerEnv.CONTAINER_APP_ROOT, image.containerAppRoot);
const command = (commandArgs, timeout = 10_000) => {
  const result = spawnSync(containerCommand, commandArgs, { encoding: "utf8", env: containerEnv,
    timeout, killSignal: "SIGKILL" });
  assert.equal(result.status, 0, `container ${commandArgs[0]}: ${result.error ?? result.stderr}`);
  return result.stdout.trim();
};
const inspectOne = (commandArgs) => {
  const resources = JSON.parse(command(commandArgs));
  assert.equal(resources.length, 1);
  return resources[0];
};
if (phase !== "finalize" && phase !== "archive") {
  const currentImage = inspectOne(["image", "inspect", image.baseReference]);
  assert.equal(currentImage.configuration.descriptor.digest, image.baseDigest);
}
const launcherSha256 = hash(await readFile(fileURLToPath(import.meta.url)));
if (phase === "bootstrap") {
  await mkdir(evidence);
}
const receiptId = phase === "bootstrap" ? randomUUID() : null;
const volumeName = receiptId ? `r3act-native-platform-${receiptId}` : null;
const volumeProofPath = path.join(evidence, "owned-volume.json");
let ownership;
if (phase === "bootstrap") {
  const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", timeout: 10_000 });
  assert.equal(git.status, 0, String(git.error ?? git.stderr));
  assert.match(git.stdout.trim(), /^[a-f0-9]{40}$/);
  ownership = { schemaVersion: 1, receiptId, volumeName, sourceCommit: git.stdout.trim(),
    baseDigest: image.baseDigest, imageProofSha256: hash(proofBytes), launcherSha256, evidence };
  await writeFile(volumeProofPath, JSON.stringify(ownership, null, 2) + "\n", { flag: "wx" });
  command(["volume", "create", "--label", `r3act.native-platform=${receiptId}`,
    "-s", "12G", volumeName], 30_000);
} else {
  ownership = JSON.parse(await readFile(volumeProofPath));
  assert.equal(ownership.evidence, evidence);
  assert.equal(ownership.baseDigest, image.baseDigest);
  assert.equal(ownership.imageProofSha256, hash(proofBytes));
  assert.equal(ownership.launcherSha256, launcherSha256);
  if (phase !== "finalize" && (phase !== "archive" || ownership.sourceLockSha256)) {
    assert.equal(hash(await readFile(path.join(evidence, "container-source-lock.json"))),
      ownership.sourceLockSha256);
    const toolchainBytes = await readFile(path.join(evidence, "toolchain-proof.json"));
    assert.equal(hash(toolchainBytes), ownership.toolchainProofSha256);
    assert.equal(JSON.parse(toolchainBytes).status, "READY", "bootstrap toolchain proof is required");
  }
}
const volume = inspectOne(["volume", "inspect", ownership.volumeName]);
assert.equal(volume.configuration.labels["r3act.native-platform"], ownership.receiptId);
assert.equal(volume.configuration.name, ownership.volumeName);
assert.ok(volume.configuration.source.startsWith("/Volumes/Depot/Containers/apple/data/"),
  "owned volume must be stored on Depot");
const phaseReceiptPath = path.join(evidence, `host-${phase}.json`);
const receipt = { schemaVersion: 1, phase, status: "STARTED", receiptId: ownership.receiptId,
  baseDigest: image.baseDigest, volumeName: ownership.volumeName,
  volumeSource: volume.configuration.source, exit: null, stopReason: null, cleanupErrors: [], error: null };
await writeFile(phaseReceiptPath, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
let activeChild;
let containerName;
let stopped = false;
const cleanupOwnedContainer = () => {
  if (!containerName) return;
  let item;
  try { item = inspectOne(["inspect", containerName]); }
  catch (error) {
    if (/container not found:/.test(String(error))) return;
    receipt.cleanupErrors.push(`Could not inspect owned container: ${String(error)}`);
    return;
  }
  if (item.configuration.labels["r3act.native-platform"] !== ownership.receiptId) {
    receipt.cleanupErrors.push("Container ownership label mismatch; no stop/delete attempted");
    return;
  }
  if (item.status.state !== "stopped") {
    try { command(["stop", "--time", "2", containerName], 15_000); }
    catch (error) { receipt.cleanupErrors.push(String(error)); }
  }
  try { command(["delete", "--force", containerName], 15_000); }
  catch (error) { receipt.cleanupErrors.push(String(error)); }
};
const stop = (reason) => {
  if (stopped) return;
  stopped = true;
  receipt.stopReason = reason;
  if (activeChild?.pid) {
    try { process.kill(-activeChild.pid, "SIGKILL"); }
    catch { activeChild.kill("SIGKILL"); }
  }
};
const interrupt = () => stop("SIGINT");
const terminate = () => stop("SIGTERM");
process.on("SIGINT", interrupt);
process.on("SIGTERM", terminate);
let timer;
try {
  if (phase === "finalize") {
    command(["volume", "delete", ownership.volumeName], 30_000);
    receipt.status = "PASS";
  } else if (phase === "archive" && !ownership.sourceLockSha256) {
    receipt.status = "INCOMPLETE";
    receipt.error = "Bootstrap never completed; host failure logs remain, with no benchmark proof to extract";
  } else {
    if (phase === "archive") {
      const currentImage = inspectOne(["image", "inspect", image.baseReference]);
      assert.equal(currentImage.configuration.descriptor.digest, image.baseDigest);
    }
    const limitMs = phase === "benchmark-run" ? 300_000
      : phase === "benchmark-prepare" ? 1_800_000
      : phase === "verify" ? 2_700_000 : 600_000;
    containerName = `r3act-${phase}-${randomUUID()}`;
    const argumentsForContainer = ["run", "--rm", "--name", containerName,
      "--platform", "linux/arm64", "--cpus", "4", "--memory", "6G",
      "--label", `r3act.native-platform=${ownership.receiptId}`,
      "--mount", `type=volume,source=${ownership.volumeName},target=/workspace`,
      "--mount", `type=bind,source=${root},target=/source,readonly`,
      "--mount", `type=bind,source=${evidence},target=/evidence`,
      "--env", `R3ACT_SOURCE_COMMIT=${ownership.sourceCommit}`,
      "--env", "CARGO_BUILD_JOBS=2",
      "--env", "RUSTUP_HOME=/workspace/toolchain/rustup",
      "--env", "CARGO_HOME=/workspace/toolchain/cargo",
      "--env", "PATH=/workspace/toolchain/cargo/bin:/workspace/toolchain/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
      image.baseReference, "node",
      phase === "bootstrap"
        ? "/source/implementation/2026-10-18-native-platforms/linux/run-container.mjs"
        : "/workspace/r3act/implementation/2026-10-18-native-platforms/linux/run-container.mjs",
      phase];
    const stdout = createWriteStream(path.join(evidence, `host-${phase}.stdout.log`), { flags: "wx" });
    const stderr = createWriteStream(path.join(evidence, `host-${phase}.stderr.log`), { flags: "wx" });
    const child = spawn(containerCommand, argumentsForContainer, { cwd: root, env: containerEnv,
      detached: true, stdio: ["ignore", "pipe", "pipe"] });
    activeChild = child;
    child.stdout.on("data", (chunk) => { stdout.write(chunk); process.stdout.write(chunk); });
    child.stderr.on("data", (chunk) => { stderr.write(chunk); process.stderr.write(chunk); });
    timer = setTimeout(() => stop(`${limitMs}ms phase deadline`), limitMs);
    const result = await new Promise((resolve) => {
      let error = null;
      child.once("error", (cause) => { error = String(cause); });
      child.once("close", (code, signal) => resolve({ code, signal, error }));
    });
    clearTimeout(timer);
    stdout.end();
    stderr.end();
    receipt.exit = result;
    activeChild = undefined;
    if (stopped) throw new Error(`owned container phase interrupted: ${receipt.stopReason}`);
    assert.equal(result.code, 0, `container phase failed: ${result.error ?? result.signal ?? result.code}`);
    cleanupOwnedContainer();
    assert.equal(receipt.cleanupErrors.length, 0, "owned container cleanup was not confirmed");
    if (phase === "bootstrap") {
      const sourceLock = await readFile(path.join(evidence, "container-source-lock.json"));
      const toolchain = JSON.parse(await readFile(path.join(evidence, "toolchain-proof.json")));
      assert.equal(toolchain.status, "READY");
      ownership.sourceLockSha256 = hash(sourceLock);
      ownership.toolchainProofSha256 = hash(await readFile(path.join(evidence, "toolchain-proof.json")));
      await writeFile(volumeProofPath, JSON.stringify(ownership, null, 2) + "\n");
    }
    receipt.status = "PASS";
  }
} catch (error) {
  stop(receipt.stopReason ?? "failure");
  cleanupOwnedContainer();
  receipt.status = "FAIL";
  receipt.error = String(error?.stack ?? error);
  throw error;
} finally {
  clearTimeout(timer);
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", terminate);
  if (receipt.cleanupErrors.length && receipt.status === "PASS") receipt.status = "FAIL";
  await writeFile(phaseReceiptPath, JSON.stringify(receipt, null, 2) + "\n");
}
