import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const stage = path.dirname(fileURLToPath(import.meta.url));
assert.deepEqual(process.argv.slice(2, 3), ["--output-dir"]);
assert.equal(process.argv.length, 4);
const output = path.resolve(process.argv[3]);
assert.equal(path.dirname(output), stage);
const containerCommand = process.env.R3ACT_CONTAINER_COMMAND ?? "/Users/mini/.local/bin/container";
assert.ok(path.isAbsolute(containerCommand));
const containerEnv = { ...process.env, CONTAINER_APP_ROOT: "/Volumes/Depot/Containers/apple/data" };
const baseTag = "docker.io/library/node:24.18.0-bookworm";
await mkdir(output);
const receiptPath = path.join(output, "image-attempt.json");
const receipt = { schemaVersion: 1, status: "STARTED", baseTag, containerCommand,
  containerAppRoot: containerEnv.CONTAINER_APP_ROOT, steps: [], error: null };
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
let activeChild;
let interrupted = false;
const killChildGroup = () => {
  interrupted = true;
  if (activeChild?.pid) {
    try { process.kill(-activeChild.pid, "SIGKILL"); }
    catch { activeChild.kill("SIGKILL"); }
  }
};
process.on("SIGINT", killChildGroup);
process.on("SIGTERM", killChildGroup);
const run = async (label, args, timeoutMs) => {
  assert.equal(interrupted, false, "image preparation interrupted");
  const child = spawn(containerCommand, args, { cwd: stage, env: containerEnv,
    detached: true, stdio: ["ignore", "pipe", "pipe"] });
  activeChild = child;
  const stdout = [], stderr = [];
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  const timer = setTimeout(killChildGroup, timeoutMs);
  const result = await new Promise((resolve) => {
    let error = null;
    child.once("error", (cause) => { error = String(cause); });
    child.once("close", (code, signal) => resolve({ code, signal, error }));
  });
  clearTimeout(timer);
  activeChild = undefined;
  const out = Buffer.concat(stdout), err = Buffer.concat(stderr);
  await writeFile(path.join(output, `${label}.stdout.log`), out, { flag: "wx" });
  await writeFile(path.join(output, `${label}.stderr.log`), err, { flag: "wx" });
  receipt.steps.push({ label, args, ...result, timeoutMs });
  assert.equal(interrupted, false, `${label} interrupted or timed out`);
  assert.equal(result.code, 0, `${label} failed: ${result.error ?? err.toString("utf8")}`);
  return out.toString("utf8").trim();
};
const inspectImage = async (reference, label) => {
  const resources = JSON.parse(await run(label, ["image", "inspect", reference], 30_000));
  assert.equal(resources.length, 1, `one image expected for ${reference}`);
  const digest = resources[0]?.configuration?.descriptor?.digest;
  assert.match(digest ?? "", /^sha256:[a-f0-9]{64}$/);
  return digest;
};
try {
  const containerVersions = JSON.parse(await run("container-version",
    ["system", "version", "--format", "json"], 30_000));
  assert.ok(containerVersions.some((entry) => entry.appName === "container" &&
    entry.version === "1.5.0"), "Apple container 1.5.0 CLI is required");
  await run("base-pull", ["image", "pull", "--platform", "linux/arm64", baseTag], 600_000);
  const baseDigest = await inspectImage(baseTag, "base-inspect");
  const baseReference = `docker.io/library/node@${baseDigest}`;
  assert.equal(await inspectImage(baseReference, "digest-inspect"), baseDigest);
  const proof = { schemaVersion: 1, status: "BASE_IDENTITY_CAPTURED",
    baseTag, baseDigest, baseReference, containerVersions, containerCommand,
    containerAppRoot: containerEnv.CONTAINER_APP_ROOT, platform: "linux/arm64",
    toolchain: "Installed into the owned workspace volume during named bootstrap",
    limits: "Apple container Linux VM on this Mac; not an independent physical device" };
  await writeFile(path.join(output, "image-proof.json"), JSON.stringify(proof, null, 2) + "\n", { flag: "wx" });
  receipt.status = "READY";
} catch (error) {
  receipt.status = "FAIL";
  receipt.error = String(error?.stack ?? error);
  throw error;
} finally {
  process.off("SIGINT", killChildGroup);
  process.off("SIGTERM", killChildGroup);
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
}
