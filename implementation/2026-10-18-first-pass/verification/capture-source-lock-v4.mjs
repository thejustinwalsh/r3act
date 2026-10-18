import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const execFileAsync = promisify(execFile);
const result = await execFileAsync("git", ["status", "--porcelain", "--untracked-files=all", "-z"], { cwd: root, encoding: "buffer" });
const paths = new Set();
for (const entry of result.stdout.toString("utf8").split("\0").filter(Boolean)) {
  const filename = entry.slice(3).trim();
  if ((filename.startsWith("src/") || filename.startsWith("compiler/") || filename.startsWith("packages/") || filename.startsWith("scripts/")) &&
      !filename.includes("/target/") && !filename.includes("/node_modules/")) paths.add(filename);
}
for (const filename of [
  "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.r3act-packages.json", "vite.config.ts", "deno.json", "deno.lock",
  "implementation/2026-10-16-publication/verification/deno-runtime.lock",
  "implementation/2026-10-18-first-pass/verification/preparation.md",
  "implementation/2026-10-18-first-pass/verification/capture-source-lock-v4.mjs",
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
const output = path.join(root, "implementation/2026-10-18-first-pass/verification/source-lock-v4.json");
await writeFile(output, JSON.stringify({ schemaVersion: "first-pass-source-lock-v4", status: "FROZEN_BEFORE_CONSUMER_GATE", capturedAt: new Date().toISOString(), inputs }, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ output, inputCount: inputs.length, readErrors: inputs.filter((item) => item.readError) }));
