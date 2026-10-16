import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const reviewDirectory = path.dirname(fileURLToPath(import.meta.url));
const stageRoot = path.resolve(reviewDirectory, "..");
const compilerRoot = path.join(stageRoot, "compiler/oxc-spike");
const fixturePath = path.join(stageRoot, "compiler/fixtures/native-owner-cut-kernel.tsx");
const binaryPath = path.join(stageRoot, "target/debug/ui-graph-compiler-spike");
const source = await readFile(fixturePath, "utf8");
const request = {
  id: "strict-owner-kernel-table-check",
  path: "native-owner-cut-kernel.tsx",
  source,
  helper_module: "native_runtime_api.ts",
  component_module: source,
};
const response = spawnSync(binaryPath, ["--serve-native"], {
  cwd: compilerRoot,
  input: `${JSON.stringify(request)}\n`,
  encoding: "utf8",
});
assert.equal(response.status, 0, response.stderr);
const result = JSON.parse(response.stdout.trim().split("\n").at(-1));
assert.equal(result.error, undefined);
const moduleSource = result.plan.component_module;
const start = moduleSource.indexOf("const __nativeOwnerCutKernels:");
assert.notEqual(start, -1);
const end = moduleSource.indexOf("\n__nativeDefineComponent(", start);
assert.notEqual(end, -1);
const table = moduleSource.slice(start, end).trim();
assert.match(table, /CompiledOwnerUpdateProgram\[\] = \[/);
const outputPath = path.join(reviewDirectory, "generated-kernel-table.ts");
await writeFile(outputPath, `${table}\n`, { flag: "w" });
console.log(outputPath);
