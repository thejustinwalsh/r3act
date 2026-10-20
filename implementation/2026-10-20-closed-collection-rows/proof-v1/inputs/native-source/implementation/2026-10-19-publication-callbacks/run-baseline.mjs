import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, mkdir, readFile, readdir, stat, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const unit = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(unit, "../..");
const baselineCommit = "7d4a66169efabe56581ab91490eba7afb0bcd6e4";
const args = process.argv.slice(2);
assert.ok(args.length === 0 || args.length === 2 && args[0] === "--output-dir",
  "usage: node run-baseline.mjs [--output-dir ABSOLUTE_NEW_EVIDENCE_DIR]");
const output = args.length ? args[1] : path.join(unit, "evidence-baseline-v1");
assert.ok(path.isAbsolute(output) && path.dirname(output) === unit &&
  /^evidence-baseline-[a-zA-Z0-9-]+$/.test(path.basename(output)),
  "baseline output must be a new evidence-baseline-* directory inside this unit");
assert.equal(process.version, "v24.18.0", "Node 24.18.0 required");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const hashFile = async (filename) => sha(await readFile(filename));
const rel = (filename) => path.relative(output, filename).replaceAll(path.sep, "/");
const snapshot = path.join(output, "snapshot");
const fixtureRelative = "compiler/compiled_publication_callbacks_execution_test.mjs";
const fixture = path.join(root, fixtureRelative);
const runner = fileURLToPath(import.meta.url);
const binaryRelative = "compiler/oxc-spike/target/debug/ui-graph-compiler-spike";
const currentBinary = path.join(root, binaryRelative);
const compilerInSnapshot = path.join(snapshot, binaryRelative);
const receiptPath = path.join(output, "baseline-receipt.json");
await mkdir(output, { recursive: false });
await mkdir(path.join(output, "commands"));
const receipt = { schemaVersion: "publication-callbacks-baseline-v1", status: "STARTED",
  baselineCommit, diagnosticFixture: fixtureRelative, nodeVersion: process.version,
  runner: { path: path.relative(root, runner).replaceAll(path.sep, "/"), sha256: await hashFile(runner) },
  sourceArchive: null, sourceFiles: [], rustSourceMatchesCurrent: false,
  fixture: null, compiler: null, package: null, dependencyTree: null,
  commands: [], fixtureArtifacts: [], fixtureResult: null, sourceAfter: [],
  fixtureAfterSha256: null, compilerAfterSha256: null, errors: [] };
await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
let active = null;
let interrupted = null;
const stop = (signal) => {
  interrupted ??= signal;
  if (active?.pid) try { process.kill(-active.pid, "SIGKILL"); } catch {}
};
const onInt = () => stop("SIGINT");
const onTerm = () => stop("SIGTERM");
process.on("SIGINT", onInt);
process.on("SIGTERM", onTerm);
const walk = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(filename));
    else if (entry.isFile()) files.push(filename);
    else throw new Error(`unexpected source entry: ${filename}`);
  }
  return files.sort();
};
const command = async (name, executable, commandArgs, { cwd = root, env = process.env,
  deadlineMs = 30_000, maxStdout = 16 * 1024 * 1024 } = {}) => {
  assert.equal(interrupted, null, `interrupted before ${name}`);
  const startedAt = new Date().toISOString();
  const child = spawn(executable, commandArgs, { cwd, env, detached: true,
    stdio: ["ignore", "pipe", "pipe"] });
  active = child;
  const stdout = [], stderr = [];
  let stdoutBytes = 0, spawnError = null, stopReason = null;
  const halt = (reason) => {
    stopReason ??= reason;
    if (child.pid) try { process.kill(-child.pid, "SIGKILL"); } catch {}
  };
  child.stdout.on("data", (chunk) => {
    stdoutBytes += chunk.length;
    if (stdoutBytes > maxStdout) halt("stdout-limit");
    else stdout.push(chunk);
  });
  child.stderr.on("data", (chunk) => {
    if (stderr.reduce((total, item) => total + item.length, 0) + chunk.length > 1024 * 1024)
      halt("stderr-limit");
    else stderr.push(chunk);
  });
  const timer = setTimeout(() => halt(`deadline-${deadlineMs}ms`), deadlineMs);
  const closed = await new Promise((resolve) => {
    child.once("error", (error) => { spawnError = String(error); });
    child.once("close", (exitCode, signal) => resolve({ exitCode, signal }));
  });
  clearTimeout(timer);
  active = null;
  const stdoutBytesResult = Buffer.concat(stdout), stderrBytesResult = Buffer.concat(stderr);
  const stdoutPath = path.join(output, "commands", `${name}.stdout`);
  const stderrPath = path.join(output, "commands", `${name}.stderr`);
  await writeFile(stdoutPath, stdoutBytesResult, { flag: "wx" });
  await writeFile(stderrPath, stderrBytesResult, { flag: "wx" });
  const result = { name, command: [executable, ...commandArgs], cwd, startedAt, deadlineMs,
    exitCode: closed.exitCode, signal: closed.signal, spawnError, stopReason,
    stdout: { path: rel(stdoutPath), sha256: sha(stdoutBytesResult), bytes: stdoutBytesResult.length },
    stderr: { path: rel(stderrPath), sha256: sha(stderrBytesResult), bytes: stderrBytesResult.length } };
  receipt.commands.push(result);
  assert.ok(!interrupted && !stopReason && !spawnError && closed.exitCode === 0 && !closed.signal,
    `${name} failed: ${JSON.stringify({ interrupted, stopReason, spawnError, ...closed })}`);
  return stdoutBytesResult;
};
try {
  const archiveBytes = await command("git-archive", "git",
    ["archive", "--format=tar", baselineCommit, "src", "compiler"]);
  assert.ok(archiveBytes.length > 0 && archiveBytes.length <= 16 * 1024 * 1024,
    "baseline archive exceeded bounded source size");
  const archivePath = path.join(output, "baseline-source.tar");
  await writeFile(archivePath, archiveBytes, { flag: "wx" });
  receipt.sourceArchive = { path: rel(archivePath), sha256: sha(archiveBytes), bytes: archiveBytes.length };
  await mkdir(snapshot);
  await command("tar-extract", "tar", ["-xf", archivePath, "-C", snapshot]);
  for (const directory of ["src", "compiler"]) {
    for (const filename of await walk(path.join(snapshot, directory))) {
      const details = await stat(filename);
      receipt.sourceFiles.push({ path: path.relative(snapshot, filename).replaceAll(path.sep, "/"),
        sha256: await hashFile(filename), bytes: details.size });
    }
  }
  assert.equal(receipt.sourceFiles.length, 486, "baseline tracked source count changed");
  const rustFiles = receipt.sourceFiles.filter((item) => item.path.startsWith("compiler/oxc-spike/"));
  assert.ok(rustFiles.length > 0, "baseline compiler source missing");
  for (const item of rustFiles) assert.equal(await hashFile(path.join(root, item.path)), item.sha256,
    `current compiler source differs from baseline: ${item.path}`);
  receipt.rustSourceMatchesCurrent = true;
  const fixtureBytes = await readFile(fixture);
  const stagedFixture = path.join(snapshot, fixtureRelative);
  await copyFile(fixture, stagedFixture, constants.COPYFILE_EXCL);
  assert.equal(await hashFile(stagedFixture), sha(fixtureBytes));
  receipt.fixture = { sourcePath: fixtureRelative, stagedPath: rel(stagedFixture),
    sha256: sha(fixtureBytes), bytes: fixtureBytes.length };
  const packageBytes = await readFile(path.join(root, "package.json"));
  await writeFile(path.join(snapshot, "package.json"), packageBytes, { flag: "wx" });
  receipt.package = { path: "package.json", sha256: sha(packageBytes), bytes: packageBytes.length };
  const dependencyTree = path.join(root, "node_modules");
  assert.ok((await stat(dependencyTree)).isDirectory(), "current node_modules missing");
  await symlink(dependencyTree, path.join(snapshot, "node_modules"), "dir");
  receipt.dependencyTree = { stagedPath: "snapshot/node_modules", target: dependencyTree,
    scope: "shared installed dependencies; no historical dependency-tree claim" };
  const binaryBytes = await readFile(currentBinary);
  await mkdir(path.dirname(compilerInSnapshot), { recursive: true });
  await writeFile(compilerInSnapshot, binaryBytes, { flag: "wx", mode: 0o755 });
  assert.equal(await hashFile(compilerInSnapshot), sha(binaryBytes));
  receipt.compiler = { sourcePath: binaryRelative, stagedPath: rel(compilerInSnapshot),
    sha256: sha(binaryBytes), bytes: binaryBytes.length,
    limit: "current compiler binary used with byte-identical baseline Rust source" };
  const fixtureStdout = await command("baseline-fixture", process.execPath,
    ["--experimental-transform-types", stagedFixture, "--expect-baseline-bug"],
    { cwd: snapshot, env: { ...process.env, R3ACT_CAPTURED_COMPILER_SHA256: receipt.compiler.sha256 },
      deadlineMs: 90_000, maxStdout: 1024 * 1024 });
  assert.match(fixtureStdout.toString("utf8"), /PASS compiled publication callback regression/);
  receipt.status = "PASS_BASELINE_BUG_REPRODUCED";
} catch (error) {
  receipt.status = "FAIL_OR_INCOMPLETE";
  receipt.errors.push(error instanceof Error ? error.stack ?? String(error) : String(error));
  process.exitCode = interrupted === "SIGINT" ? 130 : interrupted === "SIGTERM" ? 143 : 1;
} finally {
  try {
    assert.equal(await hashFile(runner), receipt.runner.sha256,
      "baseline runner changed during execution");
    if (receipt.fixture) {
      receipt.fixtureAfterSha256 = await hashFile(fixture);
      assert.equal(receipt.fixtureAfterSha256, receipt.fixture.sha256,
        "diagnostic fixture changed during baseline execution");
      assert.equal(await hashFile(path.join(snapshot, fixtureRelative)), receipt.fixture.sha256,
        "staged diagnostic fixture changed during baseline execution");
    }
    if (receipt.compiler) {
      receipt.compilerAfterSha256 = await hashFile(compilerInSnapshot);
      assert.equal(receipt.compilerAfterSha256, receipt.compiler.sha256,
        "staged compiler changed during baseline execution");
      assert.equal(await hashFile(currentBinary), receipt.compiler.sha256,
        "current compiler changed during baseline execution");
    }
    for (const item of receipt.sourceFiles) {
      const actual = await hashFile(path.join(snapshot, item.path));
      receipt.sourceAfter.push({ path: item.path, expected: item.sha256, actual });
      assert.equal(actual, item.sha256, `baseline source changed: ${item.path}`);
    }
  } catch (error) {
    receipt.status = "FAIL_OR_INCOMPLETE";
    receipt.errors.push(`final integrity: ${error instanceof Error ? error.stack ?? String(error) : String(error)}`);
    process.exitCode = 1;
  }
  try {
    const cache = path.join(snapshot, ".cache");
    const artifacts = await walk(cache);
    for (const filename of artifacts) {
      const destination = path.join(output, "fixture-artifacts", path.relative(cache, filename));
      await mkdir(path.dirname(destination), { recursive: true });
      const bytes = await readFile(filename);
      await writeFile(destination, bytes, { flag: "wx" });
      receipt.fixtureArtifacts.push({ path: rel(destination), sha256: sha(bytes), bytes: bytes.length });
      if (path.basename(filename) === "result.json") receipt.fixtureResult = JSON.parse(bytes.toString("utf8"));
    }
    if (receipt.status === "PASS_BASELINE_BUG_REPRODUCED") {
      assert.equal(receipt.fixtureResult?.status, "PASS");
      assert.equal(receipt.fixtureResult?.mode, "baseline-reproduction");
      assert.ok(receipt.fixtureResult.lateReads > 0);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      receipt.status = "FAIL_OR_INCOMPLETE";
      receipt.errors.push(`artifact archive: ${error instanceof Error ? error.stack ?? String(error) : String(error)}`);
      process.exitCode = 1;
    } else if (receipt.status === "PASS_BASELINE_BUG_REPRODUCED") {
      receipt.status = "FAIL_OR_INCOMPLETE";
      receipt.errors.push("fixture did not leave its expected .cache artifacts");
      process.exitCode = 1;
    }
  }
  if (interrupted) receipt.interruptedBy = interrupted;
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
  process.off("SIGINT", onInt);
  process.off("SIGTERM", onTerm);
}
console.log(JSON.stringify({ status: receipt.status, receiptPath }));
