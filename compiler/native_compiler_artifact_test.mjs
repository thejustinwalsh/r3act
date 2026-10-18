import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmod, copyFile, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  resolvePackagedNativeCompiler,
  verifyPackagedNativeCompiler,
} from "./native_compiler_artifact.ts";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const directory = path.join(root, ".cache", `compiler-artifact-conformance-${randomUUID()}`);
await mkdir(directory, { recursive: true });
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const runtime = { platform: "darwin", arch: "arm64" };
const info = { schemaVersion: 1, protocolVersion: 1, target: "aarch64-apple-darwin",
  ...runtime, version: "0.1.0" };
let sequence = 0;
const checks = [];
const fixture = async (information = info, overrides = {}) => {
  const bin = path.join(directory, `case-${++sequence}`);
  const target = overrides.target ?? info.target;
  const filename = `${target}/ui-graph-compiler-spike`;
  const script = `#!${process.execPath}\nprocess.stdout.write(${JSON.stringify(JSON.stringify(information) + "\n")});\n`;
  const binary = path.join(bin, filename);
  await mkdir(path.dirname(binary), { recursive: true });
  await writeFile(binary, script, { flag: "wx" });
  await chmod(binary, 0o755);
  const artifact = { target, ...runtime, file: filename, sha256: sha(script),
    bytes: Buffer.byteLength(script), ...overrides };
  const manifest = { schemaVersion: 1, protocolVersion: 1, artifacts: [artifact] };
  const save = () => writeFile(path.join(bin, "manifest.json"), JSON.stringify(manifest));
  await save();
  return { bin, binary, artifact, manifest, save, script };
};
const rejects = async (operation, label) => {
  await assert.rejects(operation);
  checks.push(label);
};
try {
  assert.equal(await resolvePackagedNativeCompiler(path.join(directory, "absent"), runtime), undefined);
  checks.push("only absent bin directory permits checkout selection");
  const missing = path.join(directory, "missing-manifest");
  await mkdir(missing);
  await rejects(() => resolvePackagedNativeCompiler(missing, runtime), "installed bin without manifest rejects");
  const valid = await fixture();
  const selected = await resolvePackagedNativeCompiler(valid.bin, runtime);
  assert.equal(selected.binaryPath, valid.binary);
  assert.deepEqual(selected.artifact, valid.artifact);
  await verifyPackagedNativeCompiler(selected.binaryPath, selected.artifact);
  checks.push("matching manifest hash, bytes and executable info admit");
  for (const field of ["schemaVersion", "protocolVersion"]) {
    const value = await fixture();
    value.manifest[field] = 999;
    await value.save();
    await rejects(() => resolvePackagedNativeCompiler(value.bin, runtime), `${field} mismatch rejects`);
  }
  const corrupt = await fixture();
  await writeFile(corrupt.binary, "modified executable");
  await rejects(() => resolvePackagedNativeCompiler(corrupt.bin, runtime), "modified executable rejects");
  const wrongSize = await fixture();
  wrongSize.artifact.bytes++;
  await wrongSize.save();
  await rejects(() => resolvePackagedNativeCompiler(wrongSize.bin, runtime), "incorrect executable size rejects");
  const duplicate = await fixture();
  duplicate.manifest.artifacts.push({ ...duplicate.artifact });
  await duplicate.save();
  await rejects(() => resolvePackagedNativeCompiler(duplicate.bin, runtime), "duplicate target rejects");
  const ambiguous = await fixture(info, {
    target: "i686-unknown-linux-gnu", platform: "linux", arch: "ia32",
  });
  const alternative = { ...ambiguous.artifact, target: "i586-unknown-linux-gnu",
    file: "i586-unknown-linux-gnu/ui-graph-compiler-spike" };
  await mkdir(path.dirname(path.join(ambiguous.bin, alternative.file)));
  await writeFile(path.join(ambiguous.bin, alternative.file), ambiguous.script);
  ambiguous.manifest.artifacts.push(alternative);
  await ambiguous.save();
  await rejects(() => resolvePackagedNativeCompiler(ambiguous.bin,
    { platform: "linux", arch: "ia32", linuxLibc: "gnu" }), "ambiguous compatible targets reject");
  const escape = await fixture();
  escape.artifact.file = "../outside";
  await escape.save();
  await rejects(() => resolvePackagedNativeCompiler(escape.bin, runtime), "relative path escape rejects");
  const link = await fixture();
  await rm(path.dirname(link.binary), { recursive: true });
  await symlink(path.dirname(valid.binary), path.dirname(link.binary));
  await rejects(() => resolvePackagedNativeCompiler(link.bin, runtime), "symlink escape with a valid manifest path rejects");
  await rejects(() => resolvePackagedNativeCompiler(valid.bin, { platform: "linux", arch: "x64", linuxLibc: "gnu" }),
    "unsupported runtime target rejects");
  for (const libc of ["gnu", "musl"]) {
    const target = `x86_64-unknown-linux-${libc}`;
    const value = await fixture({ ...info, target, platform: "linux", arch: "x64" },
      { target, platform: "linux", arch: "x64" });
    assert.equal((await resolvePackagedNativeCompiler(value.bin,
      { platform: "linux", arch: "x64", linuxLibc: libc })).artifact.target, target);
    await rejects(() => resolvePackagedNativeCompiler(value.bin,
      { platform: "linux", arch: "x64", linuxLibc: libc === "gnu" ? "musl" : "gnu" }),
    `${libc} binary rejects opposite libc`);
    await rejects(() => resolvePackagedNativeCompiler(value.bin,
      { platform: "linux", arch: "x64", linuxLibc: "unknown" }), `${libc} binary rejects unknown libc`);
  }
  checks.push("Linux ABI selection is explicit and conservative");
  for (const [label, change] of [
    ["protocol", { protocolVersion: 2 }], ["target", { target: "x86_64-apple-darwin" }],
    ["platform", { platform: "linux" }], ["arch", { arch: "x64" }],
  ]) {
    const value = await fixture({ ...info, ...change });
    const candidate = await resolvePackagedNativeCompiler(value.bin, runtime);
    await rejects(() => verifyPackagedNativeCompiler(candidate.binaryPath, candidate.artifact),
      `executable info ${label} mismatch rejects`);
  }
  for (const [label, body] of [
    ["malformed JSON", 'process.stdout.write("not JSON\\n");'],
    ["nonzero exit", 'process.exit(3);'],
  ]) {
    const value = await fixture();
    const script = `#!${process.execPath}\n${body}\n`;
    await writeFile(value.binary, script);
    value.artifact.sha256 = sha(script);
    value.artifact.bytes = Buffer.byteLength(script);
    await value.save();
    const candidate = await resolvePackagedNativeCompiler(value.bin, runtime);
    await rejects(() => verifyPackagedNativeCompiler(candidate.binaryPath, candidate.artifact),
      `executable info ${label} rejects`);
  }
  if (process.platform !== "darwin" && process.platform !== "linux") {
    throw new Error("Native compiler lifecycle fixture supports POSIX Darwin/Linux only");
  }
  const targetDir = process.env.CARGO_TARGET_DIR
    ? path.resolve(root, process.env.CARGO_TARGET_DIR)
    : path.join(root, "compiler", "oxc-spike", "target");
  const debugBinary = path.join(targetDir, ...(process.env.CARGO_BUILD_TARGET
    ? [process.env.CARGO_BUILD_TARGET] : []), "debug", "ui-graph-compiler-spike");
  const identity = spawnSync(debugBinary, ["--compiler-info"], {
    encoding: "utf8", timeout: 3000, killSignal: "SIGKILL", maxBuffer: 8192,
  });
  assert.equal(identity.error, undefined, "debug compiler info query failed");
  assert.equal(identity.signal, null, "debug compiler info query timed out");
  assert.equal(identity.status, 0, "debug compiler info query failed");
  const nativeInfo = JSON.parse(identity.stdout.trim());
  assert.deepEqual(Object.keys(nativeInfo).sort(),
    ["arch", "platform", "protocolVersion", "schemaVersion", "target", "version"]);
  assert.equal(nativeInfo.schemaVersion, 1);
  assert.equal(nativeInfo.protocolVersion, 1);
  assert.match(nativeInfo.target, /^[A-Za-z0-9][A-Za-z0-9._-]*$/);
  assert.equal(nativeInfo.platform, process.platform);
  assert.equal(nativeInfo.arch, process.arch);
  assert.equal(typeof nativeInfo.version, "string");
  assert.notEqual(nativeInfo.version, "");
  if (process.platform === "linux" &&
    typeof process.report?.getReport()?.header?.glibcVersionRuntime !== "string") {
    throw new Error("Native Linux lifecycle fixture requires positive glibc proof");
  }
  const startup = await fixture(nativeInfo, { target: nativeInfo.target,
    platform: nativeInfo.platform, arch: nativeInfo.arch });
  const infoStarted = path.join(directory, "info-started");
  const serviceStarted = path.join(directory, "service-started");
  const delayedScript = `#!${process.execPath}\nimport { writeFileSync } from "node:fs";\n` +
    `if (process.argv[2] === "--compiler-info") { writeFileSync(${JSON.stringify(infoStarted)}, "started"); ` +
    `setTimeout(() => process.stdout.write(${JSON.stringify(JSON.stringify(nativeInfo) + "\n")}), 200); } ` +
    `else { writeFileSync(${JSON.stringify(serviceStarted)}, "started"); }\n`;
  await writeFile(startup.binary, delayedScript);
  startup.artifact.sha256 = sha(delayedScript);
  startup.artifact.bytes = Buffer.byteLength(delayedScript);
  await startup.save();
  for (const name of ["vite_native_module.ts", "native_compiler_artifact.ts"]) {
    await copyFile(path.join(root, "compiler", name), path.join(startup.bin, "..", name));
  }
  const copiedModule = path.join(startup.bin, "..", "vite_native_module.ts");
  await mkdir(path.join(path.dirname(copiedModule), "bin"));
  await writeFile(path.join(path.dirname(copiedModule), "bin", "manifest.json"), JSON.stringify(startup.manifest));
  await mkdir(path.join(path.dirname(copiedModule), "bin", nativeInfo.target));
  const copiedBinary = path.join(path.dirname(copiedModule), "bin", startup.artifact.file);
  await copyFile(startup.binary, copiedBinary);
  await chmod(copiedBinary, 0o755);
  const { nativeModuleCompilerPlugin } = await import(pathToFileURL(copiedModule).href);
  const plugin = nativeModuleCompilerPlugin({ root });
  const context = {
    addWatchFile() {},
    async resolve(id) { return { id, external: true }; },
    error(message) { throw new Error(String(message)); },
  };
  const pending = plugin.transform.call(context,
    'import { useState } from "@r3act/core"; export function App(){const [value]=useState(1);return <div>{value}</div>}',
    path.join(root, "artifact-startup-probe.tsx"));
  let completed = false;
  let pendingFailure;
  void pending.then(() => { completed = true; }, (error) => {
    pendingFailure = error;
    completed = true;
  });
  try {
    const deadline = Date.now() + 2_000;
    while (true) {
      if (completed) throw pendingFailure ?? new Error("fixture transform completed before compiler startup");
      try { await readFile(infoStarted); break; } catch (error) {
        if (error.code !== "ENOENT" || Date.now() >= deadline) throw error;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
    await plugin.closeBundle();
    await assert.rejects(pending, /closed/);
    await assert.rejects(() => readFile(serviceStarted), { code: "ENOENT" });
    checks.push("closing during info query cannot start compiler service");
  } finally { await plugin.closeBundle(); }
  await writeFile(path.join(directory, "result.json"), JSON.stringify({ status: "PASS", checks }, null, 2) + "\n", { flag: "wx" });
  console.log(`PASS compiler artifact conformance (${checks.length} checks): ${directory}`);
} catch (error) {
  await writeFile(path.join(directory, "failure.json"), JSON.stringify({ status: "FAIL", checks,
    error: String(error?.stack ?? error) }, null, 2) + "\n", { flag: "wx" });
  throw error;
}
