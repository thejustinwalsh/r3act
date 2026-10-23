import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, stat, writeFile, cp, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const unit = path.join(root, "implementation/2026-10-23-mounted-frame-execution");
const output = path.resolve(process.argv[2] ?? "");
assert.ok(path.isAbsolute(output) && output.startsWith(path.join(unit, "verification") + path.sep));
const pin = "/Users/mini/.local/share/mise/installs/node/24.18.0/bin";
const environment = { ...process.env, CI: "true", PATH: `${pin}:${process.env.PATH}`,
  CARGO_HOME: "/Volumes/Depot/Developer/r3act/.cache/cargo", CARGO_BUILD_JOBS: "1" };
const hash = (b) => createHash("sha256").update(b).digest("hex");
const fileHash = async (p) => hash(await readFile(p));
const save = async (p, v) => writeFile(p, JSON.stringify(v, null, 2) + "\n");
const freezePath = path.join(unit, "source-review-v4.json");
const freeze = JSON.parse(await readFile(freezePath, "utf8"));
assert.equal(freeze.status, "PRIMARY_REVIEWED_MOUNTED_FRAME_EXECUTION_FREEZE_V4");
assert.equal(freeze.source.length, 72);
const freezeV3 = JSON.parse(await readFile(path.join(unit, "source-review-v3.json"), "utf8"));
const byPath = (entries) => new Map(entries.map((e) => [e.path, e]));
const v3Files = byPath(freezeV3.source), v4Files = byPath(freeze.source);
const changedSinceV3 = [...new Set([...v3Files.keys(), ...v4Files.keys()])].sort().filter((p) => {
  const a = v3Files.get(p), b = v4Files.get(p);
  return !a || !b || a.sha256 !== b.sha256 || a.bytes !== b.bytes;
});
assert.deepEqual(changedSinceV3, ["src/vdom_snapshot_runtime.ts"]);
const checkFreeze = async () => {
  const errors = [];
  for (const e of freeze.source) {
    const p = path.join(root, e.path);
    const b = await readFile(p);
    if (b.length !== e.bytes || hash(b) !== e.sha256) errors.push(e.path);
  }
  return errors;
};
const beforeErrors = await checkFreeze();
assert.deepEqual(beforeErrors, [], "v4 source freeze mismatch before commands");
await mkdir(output, { recursive: false });
await mkdir(path.join(output, "logs"));
const v3 = JSON.parse(await readFile(path.join(unit, "verification/darwin-v3/receipt.json"), "utf8"));
assert.equal(v3.status, "FAIL");
assert.equal(v3.sourceAudit.status, "MATCH");
const v3steps = new Map(v3.steps.map((s) => [s.name, s]));
const required = ["install", "cargo-test", "cargo-debug", "compiler-info", "artifact-conformance",
  "hmr-revision-plugin", "react-composition-plugin", "runtime-origin-plugin", "three-host-7",
  "direct-intent-gc", "native-candidate-gc", "compiled-collection-gc"];
for (const n of required) assert.equal(v3steps.get(n)?.status, "PASS", `cannot carry v3 ${n}`);
const v3Compiled = [...v3steps.entries()].filter(([n]) => /^compiled-\d+$/.test(n));
assert.equal(v3Compiled.length, 63);
for (const [n, s] of v3Compiled) {
  const i = Number(n.slice("compiled-".length));
  assert.ok([54, 63].includes(i) ? s.status === "PASS" : s.status === "PASS",
    `v3 ${n} did not pass; retain failure instead of carrying`);
}
const carried = { status: "CARRIED_FORWARD_BY_SOURCE_AND_SCOPE_REVIEW", from: "verification/darwin-v3/receipt.json",
  rationale: "The v4 review changes only src/vdom_snapshot_runtime.ts: two private readonly array fields are replaced by writable properties whose values remain readonly arrays; cleanup replaces arrays atomically. Rust/compiler/plugins/artifact, all compiled fixtures except rerun 54/63, and three GC checks are carried. Package build/consumer and source-level Deno/native-tooling are rerun.",
  sourceFreezeV4: "source-review-v4.json", frozenSourceEntries: freeze.source.length,
  changedSinceV3: changedSinceV3.map((p) => ({ path: p, before: v3Files.get(p), after: v4Files.get(p) })),
  unchangedSourceIdentities: [...v4Files.values()].filter((e) => v3Files.get(e.path)?.sha256 === e.sha256 &&
    v3Files.get(e.path)?.bytes === e.bytes),
  v3ReceiptSourceAudit: v3.sourceAudit, toolchains: v3.toolchains,
  steps: [...required.map((name) => {
    const s = v3steps.get(name);
    return { name, v3Status: s.status, command: s.command, dependencies: s.dependencies,
      exitCode: s.exitCode, log: `verification/darwin-v3/${s.log}`,
      compilerSha256Before: s.debugCompilerSha256Before ?? null,
      compilerSha256After: s.debugCompilerSha256After ?? null };
  }), ...v3Compiled.filter(([n]) => !["compiled-54", "compiled-63"].includes(n)).map(([name, s]) => ({
    name, v3Status: s.status, command: s.command, dependencies: s.dependencies, exitCode: s.exitCode,
    log: `verification/darwin-v3/${s.log}`, compilerSha256Before: s.debugCompilerSha256Before,
    compilerSha256After: s.debugCompilerSha256After }))] };
await save(path.join(output, "carried-prerequisites.json"), carried);
const compilerPath = path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike");
const compilerHash = async () => fileHash(compilerPath);
const receipt = { schemaVersion: 1, status: "RUNNING", generatedAt: new Date().toISOString(),
  sourceFreeze: "source-review-v4.json", sourceFreezeStatus: freeze.status,
  sourceCount: freeze.source.length, sourceAuditBefore: "MATCH", changedSinceV3,
  fixture54Scope: "Compiled mounted scalar reuse fixture; --expose-gc enables its internal memory case. This is not the separate native-candidate-gc step, which is carried independently from v3.",
  toolchains: {
    node: { path: process.execPath, version: process.version, sha256: await fileHash(process.execPath) },
    pnpm: v3.toolchains.pnpm, rustc: v3.toolchains.rustc, cargo: v3.toolchains.cargo, deno: v3.toolchains.deno,
    pathFirst: environment.PATH.split(path.delimiter)[0], childNode: environment.PATH.split(path.delimiter)[0] + "/node" },
  commands: [], carriedPrerequisites: "carried-prerequisites.json", steps: [], errors: [] };
assert.equal(process.version, "v24.18.0");
await save(path.join(output, "receipt.json"), receipt);
let active;
let interrupted = false;
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => {
  interrupted = true; receipt.interruptedBy = sig;
  if (active?.pid) { try { process.kill(-active.pid, "SIGKILL"); } catch {} }
});
const prior = (name) => v3steps.get(name)?.status === "PASS";
const steps = [
  { name: "deno-full", command: "deno", args: ["test", "--config", "deno.browser.json", "--frozen",
    "--lock=implementation/2026-10-16-publication/verification/deno-runtime.lock", "src"], timeout: 900_000 },
  { name: "native-tooling", command: "pnpm", args: ["check:native-tooling"], timeout: 300_000,
    deps: ["install:v3-pass"] },
  { name: "compiled-54", command: process.execPath, args: ["--experimental-transform-types", "--expose-gc",
    "compiler/compiled_mounted_scalar_execution_test.mjs"], timeout: 300_000,
    deps: ["install:v3-pass", "cargo-debug:v3-pass", "compiler-info:v3-pass"] },
  { name: "compiled-63", command: process.execPath, args: ["--experimental-transform-types",
    "compiler/compiled_mounted_frame_execution_test.mjs"], timeout: 300_000,
    deps: ["install:v3-pass", "cargo-debug:v3-pass", "compiler-info:v3-pass"] },
  { name: "package-build", command: "pnpm", args: ["package:r3act"], timeout: 900_000, deps: ["install:v3-pass"] },
  { name: "package-consumer", command: "pnpm", args: ["check:r3act-packages"], timeout: 900_000,
    deps: ["package-build"] },
];
for (const spec of steps) {
  const failedDeps = (spec.deps ?? []).filter((d) => d === "package-build"
    ? receipt.steps.find((s) => s.name === d)?.status !== "PASS" : !prior(d.split(":")[0]));
  if (interrupted || failedDeps.length) {
    receipt.steps.push({ name: spec.name, status: interrupted ? "SKIPPED_INTERRUPTED" : "SKIPPED_DEPENDENCY_FAILED",
      dependencies: failedDeps });
    await save(path.join(output, "receipt.json"), receipt);
    continue;
  }
  const startedAt = new Date().toISOString(); const start = performance.now();
  const logPath = path.join(output, "logs", `${spec.name}.log`);
  const log = createWriteStream(logPath, { flags: "wx" });
  const beforeCompiler = await compilerHash();
  const child = spawn(spec.command, spec.args, { cwd: root, env: environment, detached: true,
    stdio: ["ignore", "pipe", "pipe"] }); active = child;
  child.stdout.on("data", (b) => log.write(b)); child.stderr.on("data", (b) => log.write(b));
  let timeout = false, spawnError = null;
  const timer = setTimeout(() => { timeout = true; try { process.kill(-child.pid, "SIGKILL"); } catch {} }, spec.timeout);
  const result = await new Promise((resolve) => {
    child.once("error", (e) => { spawnError = String(e); });
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(timer); let cleanupError = null;
  try { process.kill(-child.pid, "SIGKILL"); } catch (e) { if (e.code !== "ESRCH") cleanupError = String(e); }
  active = undefined; await new Promise((resolve) => log.end(resolve));
  const afterCompiler = await compilerHash();
  const status = timeout ? "TIMEOUT" : interrupted ? "INTERRUPTED" : spawnError || cleanupError || result.code !== 0 || result.signal
    ? "FAIL" : (beforeCompiler !== afterCompiler ? "FAIL_COMPILER_CHANGED" : "PASS");
  const step = { name: spec.name, status, command: [spec.command, ...spec.args], dependencies: spec.deps ?? [],
    deadlineMs: spec.timeout, startedAt, durationMs: Math.round(performance.now() - start),
    log: `logs/${spec.name}.log`, exitCode: result.code, signal: result.signal, spawnError,
    groupCleanupError: cleanupError, compilerSha256Before: beforeCompiler, compilerSha256After: afterCompiler };
  receipt.steps.push(step); await save(path.join(output, "receipt.json"), receipt);
  process.stdout.write(`${step.name}: ${step.status} exit=${step.exitCode}\n`);
}
try {
  const cache = path.join(root, ".cache/r3act-package-build");
  const archive = path.join(output, "package-build-artifacts");
  const manifest = [];
  const walk = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const src = path.join(dir, e.name), rel = path.relative(cache, src);
      if (e.isDirectory()) await walk(src);
      else if (e.isFile()) {
        const bytes = await readFile(src), target = path.join(archive, rel);
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, bytes, { flag: "wx" });
        manifest.push({ path: rel.split(path.sep).join("/"), sha256: hash(bytes), bytes: bytes.length });
      } else throw new Error(`Unexpected package cache entry: ${src}`);
    }
  };
  await walk(cache); manifest.sort((a, b) => a.path.localeCompare(b.path));
  const report = manifest.find((e) => e.path === "report.json");
  receipt.packageArtifacts = { status: "ARCHIVED", packageBuildStatus: receipt.steps.find((s) => s.name === "package-build")?.status,
    path: "package-build-artifacts",
    reportPath: report && receipt.steps.find((s) => s.name === "package-build")?.status === "PASS"
      ? path.join(archive, "report.json") : null,
    reportSha256: report?.sha256 ?? null, files: manifest };
} catch (error) { receipt.errors.push(`Package artifact archive: ${error?.stack ?? error}`); }
const afterErrors = await checkFreeze();
receipt.sourceAuditAfter = afterErrors.length ? { status: "MISMATCH", paths: afterErrors } : { status: "MATCH", count: freeze.source.length };
receipt.status = !interrupted && afterErrors.length === 0 && receipt.steps.length === steps.length &&
  receipt.steps.every((s) => s.status === "PASS") ? "PASS" : "FAIL";
await save(path.join(output, "receipt.json"), receipt);
process.stdout.write(`Repair v4 ${receipt.status}: ${output}\n`);
if (receipt.status !== "PASS") process.exitCode = 1;
