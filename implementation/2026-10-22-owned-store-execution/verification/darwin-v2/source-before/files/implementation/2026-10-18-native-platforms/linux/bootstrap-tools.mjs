import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";

assert.equal(process.platform, "linux");
assert.equal(process.arch, "arm64");
assert.equal(process.env.RUSTUP_HOME, "/workspace/toolchain/rustup");
assert.equal(process.env.CARGO_HOME, "/workspace/toolchain/cargo");
const directory = "/workspace/toolchain";
const receiptPath = "/evidence/toolchain-proof.json";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const run = async (command, args) => {
  const child = spawn(command, args, { env: process.env, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; process.stdout.write(chunk); });
  child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
  const result = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  assert.equal(result.code, 0, `${command} failed: ${result.signal ?? stderr}`);
  return stdout.trim();
};
const download = async (url, destination) => {
  const response = await fetch(url);
  assert.equal(response.status, 200, `download failed: ${url}`);
  assert.ok(response.body);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination, { flags: "wx" }));
  return hash(await readFile(destination));
};
const expectedHash = async (url) => {
  const response = await fetch(url);
  assert.equal(response.status, 200, `checksum download failed: ${url}`);
  const value = (await response.text()).trim().split(/\s+/)[0];
  assert.match(value, /^[a-f0-9]{64}$/);
  return value;
};
const receipt = { schemaVersion: 1, status: "STARTED", downloads: {}, versions: {}, error: null };
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
try {
  await mkdir(path.join(directory, "bin"), { recursive: true });
  const rustupUrl = "https://static.rust-lang.org/rustup/dist/aarch64-unknown-linux-gnu/rustup-init";
  const rustupPath = path.join(directory, "rustup-init");
  const rustupSha256 = await download(rustupUrl, rustupPath);
  assert.equal(rustupSha256, await expectedHash(`${rustupUrl}.sha256`));
  receipt.downloads.rustup = { url: rustupUrl, sha256: rustupSha256 };
  await chmod(rustupPath, 0o755);
  await run(rustupPath, ["-y", "--no-modify-path", "--profile", "minimal",
    "--default-toolchain", "1.97.1"]);
  const denoUrl = "https://github.com/denoland/deno/releases/download/v2.9.7/deno-aarch64-unknown-linux-gnu.zip";
  const denoPath = path.join(directory, "deno.zip");
  const denoSha256 = await download(denoUrl, denoPath);
  assert.equal(denoSha256, await expectedHash(`${denoUrl}.sha256sum`));
  receipt.downloads.deno = { url: denoUrl, sha256: denoSha256 };
  await run("python3", ["-m", "zipfile", "-e", denoPath, path.join(directory, "bin")]);
  await chmod(path.join(directory, "bin", "deno"), 0o755);
  await run("npm", ["install", "--global", "--prefix", directory, "--ignore-scripts", "pnpm@11.25.0"]);
  for (const [name, command, args] of [
    ["node", "node", ["--version"]], ["pnpm", "pnpm", ["--version"]],
    ["deno", "deno", ["--version"]], ["rustc", "rustc", ["--version"]],
    ["cargo", "cargo", ["--version"]], ["cc", "cc", ["--version"]],
    ["cxx", "g++", ["--version"]], ["make", "make", ["--version"]],
    ["python", "python3", ["--version"]], ["pkgConfig", "pkg-config", ["--version"]],
  ]) receipt.versions[name] = await run(command, args);
  assert.match(receipt.versions.node, /^v24\.18\.0$/);
  assert.match(receipt.versions.pnpm, /^11\.25\.0$/);
  assert.match(receipt.versions.deno, /^deno 2\.9\.7/m);
  assert.match(receipt.versions.rustc, /^rustc 1\.97\.1/);
  receipt.status = "READY";
} catch (error) {
  receipt.status = "FAIL";
  receipt.error = String(error?.stack ?? error);
  throw error;
} finally {
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
}
