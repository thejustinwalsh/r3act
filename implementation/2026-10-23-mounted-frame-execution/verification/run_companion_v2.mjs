import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const unit = path.join(root, "implementation/2026-10-23-mounted-frame-execution");
const output = path.resolve(process.argv[2] ?? "");
assert.ok(path.isAbsolute(output) && output.startsWith(path.join(unit, "verification") + path.sep));
assert.equal(process.version, "v24.18.0");
const pin = "/Users/mini/.local/share/mise/installs/node/24.18.0/bin";
const env = { ...process.env, CI: "true", PATH: `${pin}:${process.env.PATH}`,
  CARGO_HOME: "/Volumes/Depot/Developer/r3act/.cache/cargo", CARGO_BUILD_JOBS: "1" };
const sha = (b) => createHash("sha256").update(b).digest("hex");
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + "\n");
const freeze = JSON.parse(await readFile(path.join(unit, "source-review-v5.json"), "utf8"));
assert.equal(freeze.status, "PRIMARY_REVIEWED_MOUNTED_FRAME_EXECUTION_FREEZE_V5");
assert.equal(freeze.source.length, 72);
async function sourceAudit() {
  const mismatches = [];
  for (const item of freeze.source) {
    const b = await readFile(path.join(root, item.path));
    if (b.length !== item.bytes || sha(b) !== item.sha256) mismatches.push(item.path);
  }
  return { status: mismatches.length ? "MISMATCH" : "MATCH", count: freeze.source.length, mismatches };
}
const before = await sourceAudit();
assert.equal(before.status, "MATCH");
await mkdir(output, { recursive: false });
const command = [process.execPath, "--experimental-transform-types",
  "compiler/compiled_mounted_frame_execution_test.mjs"];
const startClock = performance.now();
const receipt = { schemaVersion: 1, status: "RUNNING", startedAt: new Date().toISOString(),
  freeze: "source-review-v5.json", sourceAuditBefore: before,
  runtime: { executable: process.execPath, version: process.version,
    executableSha256: sha(await readFile(process.execPath)), pathFirst: env.PATH.split(path.delimiter)[0],
    childNode: path.join(env.PATH.split(path.delimiter)[0], "node"), ci: env.CI,
    cargoHome: env.CARGO_HOME, cargoBuildJobs: env.CARGO_BUILD_JOBS },
  command, deadlineMs: 300_000, step: null, sourceAuditAfter: null };
const logFile = path.join(output, "compiled63.log");
const log = createWriteStream(logFile, { flags: "wx" });
const child = spawn(command[0], command.slice(1), { cwd: root, env, detached: true,
  stdio: ["ignore", "pipe", "pipe"] });
let active = child, interruptedBy = null, timedOut = false, spawnError = null;
const terminate = (signal) => {
  interruptedBy = signal;
  if (active?.pid) { try { process.kill(-active.pid, "SIGKILL"); } catch {} }
};
process.on("SIGINT", () => terminate("SIGINT"));
process.on("SIGTERM", () => terminate("SIGTERM"));
child.stdout.on("data", (b) => log.write(b)); child.stderr.on("data", (b) => log.write(b));
const timer = setTimeout(() => { timedOut = true; terminate("DEADLINE"); }, receipt.deadlineMs);
const result = await new Promise((resolve) => {
  child.once("error", (e) => { spawnError = String(e); });
  child.once("close", (code, signal) => resolve({ code, signal }));
});
clearTimeout(timer);
let groupCleanupError = null;
try { process.kill(-child.pid, "SIGKILL"); }
catch (e) { if (e.code !== "ESRCH") groupCleanupError = String(e); }
await new Promise((resolve) => log.end(resolve)); active = undefined;
const logBytes = await readFile(logFile);
receipt.step = { status: timedOut ? "TIMEOUT" : interruptedBy ? "INTERRUPTED"
    : spawnError || groupCleanupError || result.code !== 0 || result.signal ? "FAIL" : "PASS",
  startedAt: receipt.startedAt, durationMs: Math.round(performance.now() - startClock), exitCode: result.code,
  signal: result.signal, interruptedBy, spawnError, groupCleanupError,
  log: { path: "compiled63.log", sha256: sha(logBytes), bytes: logBytes.length } };
receipt.sourceAuditAfter = await sourceAudit();
receipt.status = receipt.step.status === "PASS" && receipt.sourceAuditAfter.status === "MATCH" ? "PASS" : "FAIL";
await save(path.join(output, "receipt.json"), receipt);
process.stdout.write(`Compiled mounted-frame fixture ${receipt.status}: ${output}\n`);
if (receipt.status !== "PASS") process.exitCode = 1;
