import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const v4 = path.join(root, ".cache/compiled-owner-kernel-compiler-stage-v4");
const candidate = path.join(root, ".cache/owner-update-module-stage/candidate");
const outputDir = path.join(root, ".cache/owner-update-module-stage/review/emission-comparison");
await mkdir(outputDir, { recursive: false });
const source = await readFile(path.join(v4, "compiler/fixtures/native-owner-cut-kernel.tsx"), "utf8");
const request = {
  id: "owner-update-module-v4-parity",
  path: "native-owner-cut-kernel.tsx",
  source,
  helper_module: "native_runtime_api.ts",
  component_module: source,
};
const modules = [];
for (const [name, stage] of [["v4", v4], ["module-only", candidate]]) {
  const binary = path.join(stage, "target/debug/ui-graph-compiler-spike");
  const result = spawnSync(binary, ["--serve-native"], {
    input: `${JSON.stringify(request)}\n`,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${name} failed: ${result.stderr}`);
  const response = JSON.parse(result.stdout.trim().split("\n").at(-1));
  assert.ok(response.error == null, `${name}: ${JSON.stringify(response.error)}`);
  const output = response.plan?.component_module;
  assert.equal(typeof output, "string", `${name} missing component output`);
  await writeFile(path.join(outputDir, `${name}-response.json`), JSON.stringify(response, null, 2), { flag: "wx" });
  await writeFile(path.join(outputDir, `${name}-component_module.js`), output, { flag: "wx" });
  modules.push(output);
}
assert.equal(modules[0], modules[1], "module-only component emission must match v4 byte-for-byte");
const sha256 = createHash("sha256").update(modules[0]).digest("hex");
await writeFile(path.join(outputDir, "comparison.json"), JSON.stringify({
  status: "PASS",
  identical: true,
  componentModuleSha256: sha256,
  v4Length: modules[0].length,
  moduleOnlyLength: modules[1].length,
}, null, 2), { flag: "wx" });
process.stdout.write(`PASS byte-identical v4/module-only emission ${sha256}\n`);
