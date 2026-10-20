import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nativeVerificationInputs, nativeVerificationContext } from "./native_verification_inputs.mjs";

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
const sourceLock = async (paths) => {
  const inputs = [];
  for (const relative of paths) {
    const filename = path.join(root, relative);
    const details = await stat(filename);
    inputs.push({ path: relative, sha256: await shaFile(filename), bytes: details.size });
  }
  return { schemaVersion: 1, inputs };
};
const archiveSource = async (source) => {
  const entries = source.inputs.map(entry => ({ ...entry, kind: "runner-input" }));
  const selected = new Set(entries.map(entry => entry.path));
  const unavailableContext = [];
  for (const context of await nativeVerificationContext(root)) {
    if (selected.has(context.path)) continue;
    if (!context.available) { unavailableContext.push(context.path); continue; }
    const bytes = await readFile(path.join(root, context.path));
    entries.push({ path: context.path, sha256: sha256(bytes), bytes: bytes.length, kind: "context" });
  }
  for (const entry of entries) {
    const bytes = await readFile(path.join(root, entry.path));
    assert.equal(sha256(bytes), entry.sha256, `source changed before archiving: ${entry.path}`);
    assert.equal(bytes.length, entry.bytes);
    const destination = path.join(output, "source-before/files", entry.path);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes, { flag: "wx" });
  }
  const manifest = { status: "ARCHIVED_BEFORE_PRODUCT_COMMANDS", inputs: entries, unavailableContext };
  await json(path.join(output, "source-archive.json"), manifest);
  return { manifest: "source-archive.json", files: "source-before/files",
    runnerInputs: source.inputs.length, contextInputs: entries.length - source.inputs.length, unavailableContext };
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
const fixturePrefix = /^(compiled-|native-resource-execution-|native-collection-execution-|compiler-artifact-conformance-|numeric-state-layout$)/;
const fixedFixtureOutput = /^(native-queue-execution|native-task-transition|native-promise-store-race)\.(mjs|json)$/;
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
  for (const entry of entries) {
    const filename = path.join(cache, entry.name);
    if (entry.isDirectory() && fixturePrefix.test(entry.name)) await walk(filename);
    else if (entry.isFile() && fixedFixtureOutput.test(entry.name)) {
      files.set(entry.name, { sha256: await shaFile(filename), bytes: (await stat(filename)).size });
    }
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
const environment = { ...process.env, CARGO_HOME: process.env.CARGO_HOME ?? path.join(root, ".cache/cargo"),
  CARGO_BUILD_JOBS: process.env.CARGO_BUILD_JOBS ?? "1" };
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
const runStep = async (name, command, args, { depends = [], deadlineMs = 300_000, env = {} } = {}) => {
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
  const child = spawn(command, args, { cwd: root, env: { ...environment, ...env }, detached: true,
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
let beforeFixtures;
try {
  if (Object.hasOwn(process.env, "CARGO_TARGET_DIR") || Object.hasOwn(process.env, "CARGO_BUILD_TARGET")) {
    throw new Error("Native proof requires the default Cargo target path used by all compiled fixtures; CARGO_TARGET_DIR and CARGO_BUILD_TARGET are unsupported");
  }
  const paths = await nativeVerificationInputs(root);
  beforeSource = await sourceLock(paths);
  await json(path.join(output, "source-before.json"), beforeSource);
  const rawArchive = await archiveSource(beforeSource);
  beforeFixtures = await fixtureFiles();
  const declaredCommit = process.env.R3ACT_SOURCE_COMMIT ?? null;
  const gitResult = version("git", ["rev-parse", "HEAD"]);
  const gitHead = gitResult.exitCode === 0 && !gitResult.signal && !gitResult.error ? gitResult.stdout : null;
  receipt.source = { declaredCommit, gitHead, inputCount: paths.length, rawArchive };
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

  await runStep("native-inputs-contract", process.execPath,
    ["--test", "compiler/native_verification_inputs_test.mjs"], { deadlineMs: 300_000 });
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
  for (const [name, script] of [
    ["hmr-revision-plugin", "compiler/native_hmr_revision_test.mjs"],
    ["react-composition-plugin", "compiler/native_react_composition_test.mjs"],
    ["runtime-origin-plugin", "compiler/native_runtime_origin_test.mjs"],
  ]) {
    const before = await compilerHash();
    await runStep(name, process.execPath, ["--experimental-transform-types", script],
      { depends: ["install", "cargo-debug", "compiler-info"], deadlineMs: 300_000 });
    const step = stepByName.get(name);
    step.debugCompilerSha256Before = before;
    step.debugCompilerSha256After = await compilerHash();
    if (step.status === "PASS" && (!before || before !== step.debugCompilerSha256After))
      step.status = "FAIL_COMPILER_CHANGED";
    await json(path.join(output, `steps/${name}.json`), step);
  }
  const fixtures = ["compiled_direct_intent_test", "compiled_urgent_retained_test",
    "compiled_urgent_retained_three_test", "compiled_boundary_workset_test", "compiled_boundary_reveal_test",
    "native_resource_execution_test", "compiled_joint_transaction_test", "compiled_scoped_collection_test",
    "compiled_retained_transaction_test", "compiled_owner_row_execution_test",
    "compiled_owner_row_three_execution_test", "compiled_store_host_test", "compiled_joint_store_host_test",
    "compiled_joint_input_transaction_test", "compiled_resource_subtree_reveal_test",
    "compiled_resource_host_values_test", "compiled_store_host_values_test",
    "compiled_store_host_subtree_test", "compiled_store_projection_test", "compiled_joint_async_inputs_test",
    "compiled_component_forwarding_test", "compiled_authored_lifecycle_test",
    "compiled_resource_transaction_test", "native_async_recovery_execution_test",
    "native_forked_transition_execution_test", "native_custom_host_execution_test",
    "native_arrow_components_execution_test", "compiled_publication_callbacks_execution_test",
    "compiled_held_reader_progress_test", "compiled_closed_arrow_authoring_test",
    "compiled_numeric_owner_effects_test", "compiled_collection_owner_effects_test",
    "native_collection_execution_test", "compiled_host_value_diff_test",
    "compiled_reentrant_replacement_test", "compiled_runtime_origin_test",
    "native_root_queue_execution_test", "native_task_transition_execution_test",
    "native_promise_store_race_execution_test", "numeric_state_layout_execution_test",
    "compiled_three_resource_lifetime_test", "compiled_host_publication_domain_test",
    "compiled_group_host_admission_test", "compiled_closed_collection_rows_test"];
  for (const [index, fixture] of fixtures.entries()) {
    const name = `compiled-${String(index + 1).padStart(2, "0")}`;
    const before = await compilerHash();
    await runStep(name, process.execPath, ["--experimental-transform-types", `compiler/${fixture}.mjs`],
      { depends: ["install", "cargo-debug", "compiler-info"], deadlineMs: 300_000,
        env: fixture === "compiled_publication_callbacks_execution_test"
          ? { R3ACT_CAPTURED_COMPILER_SHA256: before ?? "" } : {} });
    const after = await compilerHash();
    const step = stepByName.get(name);
    step.debugCompilerSha256Before = before;
    step.debugCompilerSha256After = after;
    if (step.status === "PASS" && (!before || before !== after)) step.status = "FAIL_COMPILER_CHANGED";
    await json(path.join(output, "steps", `${name}.json`), step);
  }
  for (const [name, script] of [
    ["react-island-compiled-source", "compiler/compiled_react_island_test.mjs"],
    ["radix-dialog-compiled-source", "compiler/compiled_radix_dialog_test.mjs"],
  ]) {
    const before = await compilerHash();
    await runStep(name, process.execPath, ["--experimental-transform-types", script],
      { depends: ["install", "cargo-debug", "compiler-info"], deadlineMs: 300_000 });
    const step = stepByName.get(name);
    step.debugCompilerSha256Before = before;
    step.debugCompilerSha256After = await compilerHash();
    if (step.status === "PASS" && (!before || before !== step.debugCompilerSha256After))
      step.status = "FAIL_COMPILER_CHANGED";
    await json(path.join(output, `steps/${name}.json`), step);
  }
  await runStep("three-host-7", process.execPath,
    ["--experimental-transform-types", "--test", "compiler/three_host_capability_test.mjs",
      "compiler/three_property_copy_test.mjs"],
    { depends: ["install"], deadlineMs: 300_000 });
  await runStep("direct-intent-gc", process.execPath,
    ["--experimental-transform-types", "--expose-gc", "scripts/verify_direct_intent_retention.mjs"],
    { depends: ["install"], deadlineMs: 300_000 });
  await runStep("native-candidate-gc", process.execPath,
    ["--experimental-transform-types", "--expose-gc", "scripts/verify_native_candidate_retention.mjs"],
    { depends: ["install"], deadlineMs: 300_000 });
  const collectionGcCompiler = await compilerHash();
  await runStep("compiled-collection-gc", process.execPath,
    ["--experimental-transform-types", "--expose-gc", "compiler/compiled_collection_owner_retention_test.mjs"],
    { depends: ["install", "cargo-debug", "compiler-info"], deadlineMs: 90_000 });
  const collectionGcStep = stepByName.get("compiled-collection-gc");
  collectionGcStep.debugCompilerSha256Before = collectionGcCompiler;
  collectionGcStep.debugCompilerSha256After = await compilerHash();
  if (collectionGcStep.status === "PASS" &&
      (!collectionGcCompiler || collectionGcCompiler !== collectionGcStep.debugCompilerSha256After))
    collectionGcStep.status = "FAIL_COMPILER_CHANGED";
  await json(path.join(output, "steps/compiled-collection-gc.json"), collectionGcStep);
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
    receipt.fixtureArtifacts = beforeFixtures
      ? await archiveFixtureChanges(beforeFixtures)
      : { status: "SKIPPED_BASELINE_NOT_CAPTURED", files: [] };
    await json(path.join(output, "fixture-artifacts.json"), receipt.fixtureArtifacts);
  } catch (error) { receipt.errors.push(`Fixture archive: ${error?.stack ?? error}`); }
  try {
    if (beforeSource) {
      const after = await sourceLock(await nativeVerificationInputs(root));
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
