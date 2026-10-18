import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const execFileAsync = promisify(execFile);
const status = await execFileAsync("git", ["status", "--porcelain", "--untracked-files=all", "-z"], { cwd: root, encoding: "buffer" });
const entries = status.stdout.toString("utf8").split("\0").filter(Boolean);
const paths = new Set();
for (const entry of entries) {
  const filename = entry.slice(3).trim();
  if (filename && !filename.startsWith(".cache/") && !filename.includes("/target/") && !filename.includes("/node_modules/")) paths.add(filename);
}
for (const filename of [
  "implementation/2026-10-16-publication/verification/deno-runtime.lock",
  "implementation/2026-10-18-first-pass/verification/preparation.md",
  "implementation/2026-10-18-first-pass/verification/capture-source-lock.mjs",
  "compiler/compiled_joint_transaction_test.mjs",
  "implementation/2026-10-18-first-pass/benchmark/index.html",
  "implementation/2026-10-18-first-pass/benchmark/native_arm.tsx",
  "implementation/2026-10-18-first-pass/benchmark/react_arm.tsx",
  "implementation/2026-10-18-first-pass/benchmark/entry.ts",
  "implementation/2026-10-18-first-pass/benchmark/vite.config.ts",
  "implementation/2026-10-18-first-pass/benchmark/build-gate.mjs",
  "implementation/2026-10-18-first-pass/benchmark/run-pair.mjs",
]) paths.add(filename);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const inputs = [];
for (const filename of [...paths].sort()) {
  try { inputs.push({ path: filename, sha256: sha(await readFile(path.join(root, filename))) }); }
  catch (error) { inputs.push({ path: filename, readError: String(error) }); }
}
const tool = async (name, executable, args) => {
  try {
    const { stdout } = await execFileAsync(executable, args, { cwd: root, encoding: "utf8" });
    return { name, executable, version: stdout.trim().split("\n")[0] };
  } catch (error) { return { name, executable, error: String(error) }; }
};
const tools = await Promise.all([
  tool("node24", "/Users/mini/.local/share/mise/installs/node/24.18.0/bin/node", ["--version"]),
  tool("deno", "deno", ["--version"]),
  tool("cargo", "/Users/mini/.cargo/bin/cargo", ["--version"]),
  tool("pnpm", "/Users/mini/.local/share/mise/installs/node/26/bin/pnpm", ["--version"]),
]);
const output = path.join(root, "implementation/2026-10-18-first-pass/verification/source-lock-v1.json");
await writeFile(output, JSON.stringify({ schemaVersion: "first-pass-source-lock-v1", status: "FROZEN_BEFORE_GATES", capturedAt: new Date().toISOString(), inputs, tools }, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ output, inputCount: inputs.length, readErrors: inputs.filter((item) => item.readError) }));
