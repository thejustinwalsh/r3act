import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const options = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  assert.ok(process.argv[index]?.startsWith("--") && process.argv[index + 1], "Expected --name value pairs");
  assert.ok(!options.has(process.argv[index]), `Duplicate option ${process.argv[index]}`);
  options.set(process.argv[index], process.argv[index + 1]);
}
assert.deepEqual([...options.keys()].sort(),
  ["--execution-kind", "--expected-arch", "--expected-platform", "--output-dir"].sort());
const output = options.get("--output-dir");
assert.ok(path.isAbsolute(output), "--output-dir must be an absolute, nonexistent directory");
assert.ok(["darwin", "linux"].includes(options.get("--expected-platform")));
assert.ok(["arm64", "x64"].includes(options.get("--expected-arch")));
assert.ok(["native-host", "linux-vm", "github-hosted"].includes(options.get("--execution-kind")));
for (const name of ["src", "compiler", "packages", "scripts"]) {
  const directory = path.join(root, name);
  assert.ok(output !== directory && !output.startsWith(`${directory}${path.sep}`),
    "Evidence output must be outside locked product source directories");
}
await mkdir(output, { recursive: false });
await mkdir(path.join(output, "logs"));
await mkdir(path.join(output, "steps"));

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const shaFile = async (filename) => sha256(await readFile(filename));
const json = async (filename, value) => writeFile(filename, JSON.stringify(value, null, 2) + "\n");
const selectedRoots = ["src", "compiler", "packages", "scripts"];
const excluded = new Set([".git", ".cache", "node_modules", "target", "dist", "evidence", "verification",
  "benchmark", "proof", "images", "image", "generated"]);
const sourcePaths = async () => {
  const files = [];
  const walk = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (excluded.has(entry.name) || /^(?:proof|evidence|images?|generated)(?:-|$)/.test(entry.name)) continue;
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(filename);
      else if (entry.isFile()) files.push(path.relative(root, filename).split(path.sep).join("/"));
      else throw new Error(`Unsupported source entry: ${filename}`);
    }
  };
  for (const name of selectedRoots) await walk(path.join(root, name));
  for (const name of await readdir(root)) {
    if (["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "deno.json", "deno.browser.json",
      "deno.lock", "LICENSE"].includes(name) || /^tsconfig[^/]*\.json$/.test(name) || /^vite[^/]*\.ts$/.test(name)) {
      files.push(name);
    }
  }
  files.push("implementation/2026-10-16-publication/verification/deno-runtime.lock");
  for (const relative of [".github/workflows/native-package-portability.yml",
    "implementation/2026-10-18-native-platforms/design.md",
    "implementation/2026-10-18-native-platforms/source-review.md",
    "implementation/2026-10-18-resource-values/design.md",
    "implementation/2026-10-18-resource-values/source-review.md"]) {
    try { if ((await stat(path.join(root, relative))).isFile()) files.push(relative); }
    catch (error) { if (error?.code !== "ENOENT") throw error; }
  }
  const linux = path.join(root, "implementation/2026-10-18-native-platforms/linux");
  let linuxExists = false;
  try { linuxExists = (await stat(linux)).isDirectory(); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
  if (linuxExists) await walk(linux);
  return [...new Set(files)].sort();
};
const sourceLock = async (paths) => {
  const inputs = [];
  for (const relative of paths) {
    const filename = path.join(root, relative);
    const details = await stat(filename);
    inputs.push({ path: relative, sha256: await shaFile(filename), bytes: details.size });
  }
  return { schemaVersion: 1, inputs };
};
const archiveTree = async (source, destination) => {
  try { await stat(source); }
  catch (error) {
    if (error?.code === "ENOENT") return { status: "ABSENT", files: [] };
    throw error;
  }
  await cp(source, destination, { recursive: true, errorOnExist: true, force: false });
  const files = [];
  const walk = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(filename);
      else if (entry.isFile()) files.push({ path: path.relative(destination, filename).split(path.sep).join("/"),
        sha256: await shaFile(filename), bytes: (await stat(filename)).size });
      else throw new Error(`Unsupported archive entry: ${filename}`);
    }
  };
  await walk(destination);
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { status: "ARCHIVED", files };
};
const fixturePrefix = /^(compiled-|native-resource-execution-|compiler-artifact-conformance-)/;
const fixtureFiles = async () => {
  const cache = path.join(root, ".cache");
  let entries;
  try { entries = await readdir(cache, { withFileTypes: true }); }
  catch (error) {
    if (error?.code === "ENOENT") return new Map();
    throw error;
  }
  const files = new Map();
  const walk = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(filename);
      else if (entry.isFile()) files.set(path.relative(cache, filename).split(path.sep).join("/"),
        { sha256: await shaFile(filename), bytes: (await stat(filename)).size });
    }
  };
  for (const entry of entries) if (entry.isDirectory() && fixturePrefix.test(entry.name)) {
    await walk(path.join(cache, entry.name));
  }
  return files;
};
const archiveFixtureChanges = async (before) => {
  const after = await fixtureFiles();
  const destination = path.join(output, "fixture-artifacts");
  const changed = [];
  for (const [relative, detail] of after) {
    if (before.get(relative)?.sha256 === detail.sha256) continue;
    const target = path.join(destination, relative);
    await mkdir(path.dirname(target), { recursive: true });
    const contents = await readFile(path.join(root, ".cache", relative));
    await writeFile(target, contents, { flag: "wx" });
    changed.push({ path: relative, ...detail });
  }
  changed.sort((left, right) => left.path.localeCompare(right.path));
  return { status: "ARCHIVED", files: changed };
};
const validateFreshPackage = async (archive, requireConsumer) => {
  assert.equal(archive.status, "ARCHIVED", "successful package build has no fresh archive");
  const directory = path.join(output, "packaging-after");
  const archived = new Map(archive.files.map((file) => [file.path, file]));
  const readArchived = async (relative) => {
    assert.ok(archived.has(relative), `missing fresh package artifact: ${relative}`);
    const bytes = await readFile(path.join(directory, relative));
    assert.equal(sha256(bytes), archived.get(relative).sha256);
    assert.equal(bytes.length, archived.get(relative).bytes);
    return bytes;
  };
  const report = JSON.parse(await readArchived("report.json"));
  const names = ["core", "vite", "host-dom", "host-three", "react-bridge"];
  assert.deepEqual(Object.keys(report.packages).sort(), names.map((name) => `@r3act/${name}`).sort());
  const tarballs = [];
  const cache = path.join(root, ".cache/r3act-package-build");
  for (const name of names) {
    const detail = report.packages[`@r3act/${name}`];
    const relative = path.relative(cache, path.resolve(root, detail.file)).split(path.sep).join("/");
    assert.ok(relative && relative !== ".." && !relative.startsWith("../"));
    const bytes = await readArchived(relative);
    assert.equal(bytes.length, detail.bytes);
    assert.equal(sha256(bytes), detail.sha256);
    tarballs.push({ name, path: relative, sha256: detail.sha256, bytes: detail.bytes });
  }
  const binary = report.compilerBinary;
  const manifest = JSON.parse(await readArchived(`vite/${binary.manifest}`));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.protocolVersion, 1);
  assert.equal(manifest.artifacts.length, 1);
  const artifact = manifest.artifacts[0];
  assert.equal(artifact.target, binary.rustTarget);
  assert.equal(artifact.sha256, binary.sha256);
  const binaryBytes = await readArchived(`vite/${binary.path}`);
  assert.equal(sha256(binaryBytes), artifact.sha256);
  assert.equal(binaryBytes.length, artifact.bytes);
  let consumer = null;
  if (requireConsumer) {
    consumer = JSON.parse(await readArchived("consumer-verification.json"));
    assert.equal(consumer.status, "PASS");
  }
  return { status: "PASS", tarballs, compiler: artifact,
    consumerStatus: consumer?.status ?? "NOT_REQUIRED_AFTER_FAILED_CONSUMER" };
};
const version = (command, args) => {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", timeout: 10_000,
    killSignal: "SIGKILL", maxBuffer: 64 * 1024 });
  return { command: [command, ...args], exitCode: result.status, signal: result.signal,
    error: result.error ? String(result.error) : null, stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "" };
};
const debugCompiler = path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const compilerHash = async () => { try { return await shaFile(debugCompiler); } catch { return null; } };
const environment = { ...process.env, CARGO_HOME: process.env.CARGO_HOME ?? path.join(root, ".cache/cargo") };
const receipt = { schemaVersion: 1, status: "RUNNING", executionKind: options.get("--execution-kind"),
  expected: { platform: options.get("--expected-platform"), arch: options.get("--expected-arch") },
  actual: { platform: process.platform, arch: process.arch }, steps: [], errors: [] };
let interrupted = false;
let active;
const terminate = (signal) => {
  interrupted = true;
  receipt.interruptedBy = signal;
  if (active?.pid) { try { process.kill(-active.pid, "SIGKILL"); } catch {} }
};
process.on("SIGINT", () => terminate("SIGINT"));
process.on("SIGTERM", () => terminate("SIGTERM"));
const stepByName = new Map();
const recordStep = async (step) => {
  receipt.steps.push(step);
  stepByName.set(step.name, step);
  await json(path.join(output, "steps", `${step.name}.json`), step);
  await json(path.join(output, "receipt.json"), receipt);
  process.stdout.write(`${step.name}: ${step.status}${step.exitCode === undefined ? "" : ` exit=${step.exitCode}`}\n`);
};
const runStep = async (name, command, args, { depends = [], deadlineMs = 300_000 } = {}) => {
  const failed = depends.filter((dependency) => stepByName.get(dependency)?.status !== "PASS");
  if (failed.length || interrupted) {
    await recordStep({ name, status: interrupted ? "SKIPPED_INTERRUPTED" : "SKIPPED_DEPENDENCY_FAILED",
      dependencies: failed });
    return;
  }
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const logName = `logs/${name}.log`;
  const log = createWriteStream(path.join(output, logName), { flags: "wx" });
  const child = spawn(command, args, { cwd: root, env: environment, detached: true,
    stdio: ["ignore", "pipe", "pipe"] });
  active = child;
  child.stdout?.on("data", (chunk) => log.write(chunk));
  child.stderr?.on("data", (chunk) => log.write(chunk));
  let timedOut = false;
  let spawnError = null;
  const timer = setTimeout(() => {
    timedOut = true;
    if (child.pid) { try { process.kill(-child.pid, "SIGKILL"); } catch {} }
  }, deadlineMs);
  const closed = await new Promise((resolve) => {
    child.once("error", (error) => { spawnError = String(error); });
    child.once("close", (exitCode, signal) => resolve({ exitCode, signal }));
  });
  clearTimeout(timer);
  let groupCleanupError = null;
  if (child.pid) {
    try { process.kill(-child.pid, "SIGKILL"); }
    catch (error) { if (error?.code !== "ESRCH") groupCleanupError = String(error); }
  }
  active = undefined;
  await new Promise((resolve) => log.end(resolve));
  const status = timedOut ? "TIMEOUT" : interrupted ? "INTERRUPTED"
    : !spawnError && !groupCleanupError && closed.exitCode === 0 && !closed.signal ? "PASS" : "FAIL";
  await recordStep({ name, status, command: [command, ...args], dependencies: depends, deadlineMs,
    startedAt, durationMs: Math.round(performance.now() - start), log: logName,
    exitCode: closed.exitCode, signal: closed.signal, spawnError, groupCleanupError });
};

let beforeSource;
let beforeFixtures = new Map();
try {
  if (Object.hasOwn(process.env, "CARGO_TARGET_DIR") || Object.hasOwn(process.env, "CARGO_BUILD_TARGET")) {
    throw new Error("Native proof requires the default Cargo target path used by all compiled fixtures; CARGO_TARGET_DIR and CARGO_BUILD_TARGET are unsupported");
  }
  const paths = await sourcePaths();
  beforeSource = await sourceLock(paths);
  await json(path.join(output, "source-before.json"), beforeSource);
  beforeFixtures = await fixtureFiles();
  const declaredCommit = process.env.R3ACT_SOURCE_COMMIT ?? null;
  const gitResult = version("git", ["rev-parse", "HEAD"]);
  const gitHead = gitResult.exitCode === 0 && !gitResult.signal && !gitResult.error ? gitResult.stdout : null;
  receipt.source = { declaredCommit, gitHead, inputCount: paths.length };
  if (declaredCommit && !/^[a-f0-9]{40}$/.test(declaredCommit)) throw new Error("Invalid R3ACT_SOURCE_COMMIT");
  if (gitHead && !/^[a-f0-9]{40}$/.test(gitHead)) throw new Error("Invalid Git HEAD");
  if (!gitHead && !declaredCommit) throw new Error("Missing Git HEAD and R3ACT_SOURCE_COMMIT");
  if (gitHead && declaredCommit && gitHead !== declaredCommit) {
    throw new Error("Declared R3ACT_SOURCE_COMMIT does not match actual Git HEAD");
  }
  const toolchains = { node: { executable: process.execPath, version: process.version,
    sha256: await shaFile(process.execPath) }, rustc: version("rustc", ["-vV"]),
    cargo: version("cargo", ["--version"]), pnpm: version("pnpm", ["--version"]),
    deno: version("deno", ["--version"]) };
  const cpus = os.cpus();
  receipt.machine = { osType: os.type(), osRelease: os.release(), osMachine: os.machine(),
    cpuModel: cpus[0]?.model ?? null, logicalCpus: cpus.length, totalMemoryBytes: os.totalmem() };
  receipt.toolchains = toolchains;
  await json(path.join(output, "toolchains.json"), toolchains);
  if (process.platform !== receipt.expected.platform || process.arch !== receipt.expected.arch ||
    process.version !== "v24.18.0" ||
    [toolchains.rustc, toolchains.cargo, toolchains.pnpm, toolchains.deno].some((tool) =>
      tool.exitCode !== 0 || tool.signal || tool.error) ||
    !toolchains.rustc.stdout.startsWith("rustc 1.97.1 ") ||
    !toolchains.cargo.stdout.startsWith("cargo 1.97.1 ") || toolchains.pnpm.stdout !== "11.25.0" ||
    !/^deno 2\.9\.7(?:\s|$)/.test(toolchains.deno.stdout)) {
    throw new Error("Native platform or pinned Node/Rust/Cargo/pnpm/Deno toolchain differs from the requested proof tuple");
  }
  const priorCache = path.join(root, ".cache/r3act-package-build");
  receipt.packageCacheBefore = await archiveTree(priorCache, path.join(output, "packaging-before"));
  await json(path.join(output, "packaging-before.json"), receipt.packageCacheBefore);

  await runStep("install", "pnpm", ["install", "--frozen-lockfile", "--ignore-scripts"], { deadlineMs: 900_000 });
  await runStep("cargo-test", "cargo", ["test", "--locked", "--manifest-path", "compiler/oxc-spike/Cargo.toml"],
    { deadlineMs: 900_000 });
  await runStep("cargo-debug", "cargo", ["build", "--locked", "--manifest-path", "compiler/oxc-spike/Cargo.toml"],
    { deadlineMs: 900_000 });
  receipt.debugCompiler = { path: path.relative(root, debugCompiler).split(path.sep).join("/"),
    sha256AfterBuild: await compilerHash() };
  await runStep("compiler-info", debugCompiler, ["--compiler-info"],
    { depends: ["cargo-debug"], deadlineMs: 10_000 });
  if (stepByName.get("compiler-info")?.status === "PASS") {
    const raw = await readFile(path.join(output, "logs/compiler-info.log"), "utf8");
    let info;
    try { info = JSON.parse(raw.trim()); } catch {}
    receipt.debugCompiler.info = info ?? null;
    const expectedTarget = /^host: ([A-Za-z0-9_.-]+)$/m.exec(toolchains.rustc.stdout)?.[1];
    if (!info || info.schemaVersion !== 1 || info.protocolVersion !== 1 || info.target !== expectedTarget ||
      info.platform !== process.platform || info.arch !== process.arch || typeof info.version !== "string") {
      stepByName.get("compiler-info").status = "FAIL_IDENTITY";
      await json(path.join(output, "steps/compiler-info.json"), stepByName.get("compiler-info"));
    }
  }
  await runStep("deno-full", "deno", ["test", "--config", "deno.browser.json", "--frozen",
    "--lock=implementation/2026-10-16-publication/verification/deno-runtime.lock", "src"],
  { deadlineMs: 900_000 });
  await runStep("native-tooling", "pnpm", ["check:native-tooling"],
    { depends: ["install"], deadlineMs: 300_000 });
  await runStep("artifact-conformance", process.execPath,
    ["--experimental-transform-types", "compiler/native_compiler_artifact_test.mjs"],
    { depends: ["install", "cargo-debug", "compiler-info"], deadlineMs: 300_000 });
  const fixtures = ["compiled_direct_intent_test", "compiled_urgent_retained_test",
    "compiled_urgent_retained_three_test", "compiled_boundary_workset_test", "compiled_boundary_reveal_test",
    "native_resource_execution_test", "compiled_joint_transaction_test", "compiled_scoped_collection_test",
    "compiled_retained_transaction_test", "compiled_owner_row_execution_test",
    "compiled_owner_row_three_execution_test", "compiled_store_host_test", "compiled_joint_store_host_test",
    "compiled_joint_input_transaction_test", "compiled_resource_subtree_reveal_test",
    "compiled_resource_host_values_test"];
  for (const [index, fixture] of fixtures.entries()) {
    const name = `compiled-${String(index + 1).padStart(2, "0")}`;
    const before = await compilerHash();
    await runStep(name, process.execPath, ["--experimental-transform-types", `compiler/${fixture}.mjs`],
      { depends: ["install", "cargo-debug", "compiler-info"], deadlineMs: 300_000 });
    const after = await compilerHash();
    const step = stepByName.get(name);
    step.debugCompilerSha256Before = before;
    step.debugCompilerSha256After = after;
    if (step.status === "PASS" && (!before || before !== after)) step.status = "FAIL_COMPILER_CHANGED";
    await json(path.join(output, "steps", `${name}.json`), step);
  }
  await runStep("three-host-7", process.execPath,
    ["--experimental-transform-types", "--test", "compiler/three_host_capability_test.mjs"],
    { depends: ["install"], deadlineMs: 300_000 });
  await runStep("direct-intent-gc", process.execPath,
    ["--experimental-transform-types", "--expose-gc", "scripts/verify_direct_intent_retention.mjs"],
    { depends: ["install"], deadlineMs: 300_000 });
  await runStep("native-candidate-gc", process.execPath,
    ["--experimental-transform-types", "--expose-gc", "scripts/verify_native_candidate_retention.mjs"],
    { depends: ["install"], deadlineMs: 300_000 });
  await runStep("package-build", "pnpm", ["package:r3act"], { depends: ["install"], deadlineMs: 900_000 });
  await runStep("package-consumer", "pnpm", ["check:r3act-packages"],
    { depends: ["package-build"], deadlineMs: 900_000 });
} catch (error) {
  receipt.errors.push(String(error?.stack ?? error));
} finally {
  try {
    receipt.packageCacheAfter = await archiveTree(path.join(root, ".cache/r3act-package-build"),
      path.join(output, "packaging-after"));
    await json(path.join(output, "packaging-after.json"), receipt.packageCacheAfter);
    if (stepByName.get("package-build")?.status === "PASS") {
      receipt.packageValidation = await validateFreshPackage(receipt.packageCacheAfter,
        stepByName.get("package-consumer")?.status === "PASS");
      await json(path.join(output, "packaging-validation.json"), receipt.packageValidation);
    }
  } catch (error) { receipt.errors.push(`Package archive: ${error?.stack ?? error}`); }
  try {
    receipt.fixtureArtifacts = await archiveFixtureChanges(beforeFixtures);
    await json(path.join(output, "fixture-artifacts.json"), receipt.fixtureArtifacts);
  } catch (error) { receipt.errors.push(`Fixture archive: ${error?.stack ?? error}`); }
  try {
    if (beforeSource) {
      const after = await sourceLock(await sourcePaths());
      await json(path.join(output, "source-after.json"), after);
      const beforeByPath = new Map(beforeSource.inputs.map((entry) => [entry.path, entry]));
      const afterByPath = new Map(after.inputs.map((entry) => [entry.path, entry]));
      const changed = [...new Set([...beforeByPath.keys(), ...afterByPath.keys()])].sort().filter((entry) =>
        beforeByPath.get(entry)?.sha256 !== afterByPath.get(entry)?.sha256 ||
        beforeByPath.get(entry)?.bytes !== afterByPath.get(entry)?.bytes);
      receipt.sourceAudit = { status: changed.length ? "MISMATCH" : "MATCH",
        changed };
    }
  } catch (error) { receipt.errors.push(`Source audit: ${error?.stack ?? error}`); }
  receipt.status = !interrupted && receipt.errors.length === 0 && receipt.sourceAudit?.status === "MATCH" &&
    receipt.steps.length > 0 && receipt.steps.every((step) => step.status === "PASS") ? "PASS" : "FAIL";
  await json(path.join(output, "receipt.json"), receipt);
  process.stdout.write(`Native platform proof ${receipt.status}: ${output}\n`);
  if (receipt.status !== "PASS") process.exitCode = 1;
}
