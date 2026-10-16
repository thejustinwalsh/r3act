import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(evidenceDirectory, "../..");
const build = path.join(root, ".cache/native-package-build");
const report = JSON.parse(await readFile(path.join(build, "package-report.json"), "utf8"));
const packagedCompiler = path.join(build, "dist/compiler/bin/darwin-arm64/ui-graph-compiler-spike");
const releaseCompiler = path.join(root, "compiler/oxc-spike/target/release/ui-graph-compiler-spike");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sourceHashes = new Map(report.sourceMapPolicy.packagedSources.map(({ file, sha256 }) => [file, sha256]));
const compilerMain = await readFile(path.join(root, "compiler/oxc-spike/src/main.rs"), "utf8");
assert.match(compilerMain, /mod owner_update_program;/, "release build source includes the new Rust module");
const ownerProgramSource = await readFile(path.join(root, "compiler/oxc-spike/src/owner_update_program.rs"));
assert.equal(
  sha256(await readFile(releaseCompiler)),
  sha256(await readFile(packagedCompiler)),
  "installed compiler payload is the freshly built Rust release binary",
);

for (const filename of [
  "src/native_runtime_api.ts",
  "src/compiled_state_layout.ts",
  "src/component_state_runtime.ts",
  "src/owner_state_world.ts",
  "src/pending_state_changes.ts",
  "src/world_dirty_journal.ts",
  "src/vdom_snapshot_runtime.ts",
  "src/three_host.ts",
  "compiler/vite_native_module.ts",
  "compiler/vite_native_plugin.ts",
]) {
  const relative = `sources/${filename}`;
  const expected = sourceHashes.get(relative);
  assert.ok(expected, `${relative} appears in built source inventory`);
  assert.equal(sha256(await readFile(path.join(root, filename))), expected, `${relative} hash still matches the built package`);
}

const fixture = await readFile(path.join(root, "compiler/fixtures/native-owner-cut-kernel.tsx"), "utf8");
const request = {
  id: "packaged-owner-kernel-qualification",
  path: "native-owner-cut-kernel.tsx",
  source: fixture,
  helper_module: "native_runtime_api.ts",
  component_module: fixture,
};
const result = spawnSync(packagedCompiler, ["--serve-native"], {
  cwd: root,
  input: `${JSON.stringify(request)}\n`,
  encoding: "utf8",
});
assert.equal(result.status, 0, `${result.error ?? ""}\n${result.stderr}`);
const response = JSON.parse(result.stdout.trim().split("\n").at(-1));
assert.equal(response.error, undefined, JSON.stringify(response.error));
const emitted = response.plan.component_module;
assert.match(emitted, /readonly import\("native_runtime_api\.ts"\)\.CompiledOwnerUpdateProgram\[\] = \[/);
assert.equal((emitted.match(/schemaVersion: 2, programId:/g) ?? []).length, 2);
assert.match(emitted, /executeCut: function\(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues\)/);
assert.match(emitted, /stagedInputIndices\[stagedCount\] = changeIndex/);
const kernelStart = emitted.indexOf("const __nativeOwnerCutKernels:");
const kernelEnd = emitted.indexOf("\n__nativeDefineComponent(", kernelStart);
assert.ok(kernelStart >= 0 && kernelEnd > kernelStart);
assert.doesNotMatch(emitted.slice(kernelStart, kernelEnd), /changedRows/);
assert.ok(emitted.includes("ownerUpdateProgram: __nativeOwnerCutKernels[0]"));

console.log(JSON.stringify({
  status: "PASS",
  packageReportTarballSha256: report.tarballSha256,
  packagedCompilerSha256: sha256(await readFile(packagedCompiler)),
  ownerUpdateModuleSha256: sha256(ownerProgramSource),
  verifiedCurrentSourceCount: 10,
  emittedOwnerKernelCount: 2,
  ownerKernelSchemaVersion: 2,
  ownerKernelSignature: "executeCut(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues)",
  compilerModuleImport: "owner_update_program.rs via main.rs mod declaration; packaged binary emits v2 owner kernels",
}, null, 2));
