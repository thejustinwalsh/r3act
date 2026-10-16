import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "../../..");
const stages = ["v3", "v4"].map((version) =>
  path.join(projectRoot, ".cache", `compiled-owner-kernel-compiler-stage-${version}`),
);
const outputDir = path.join(scriptDir, "emission-comparison");
await mkdir(outputDir, { recursive: false });
const source = await readFile(
  path.join(stages[1], "compiler/fixtures/native-owner-cut-kernel.tsx"),
  "utf8",
);
const request = {
  id: "owner-cut-kernel-cleanup-parity",
  path: "native-owner-cut-kernel.tsx",
  source,
  helper_module: "native_runtime_api.ts",
  component_module: source,
};
const outputs = [];
for (let index = 0; index < stages.length; index++) {
  const version = index === 0 ? "v3" : "v4";
  const binary = path.join(stages[index], "target/debug/ui-graph-compiler-spike");
  const result = spawnSync(binary, ["--serve-native"], {
    input: `${JSON.stringify(request)}\n`,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${version} compile failed: ${result.stderr}`);
  const response = JSON.parse(result.stdout.trim().split("\n").at(-1));
  assert.ok(response.error == null, `${version}: ${JSON.stringify(response.error)}`);
  const emitted = response.plan?.component_module;
  assert.equal(typeof emitted, "string", `${version} missing component output`);
  await writeFile(path.join(outputDir, `${version}-response.json`), JSON.stringify(response, null, 2), { flag: "wx" });
  await writeFile(path.join(outputDir, `${version}-component_module.js`), emitted, { flag: "wx" });
  outputs.push(emitted);
}
assert.equal(outputs[0], outputs[1], "v3/v4 component emission must be byte-identical");
const sha256 = createHash("sha256").update(outputs[0]).digest("hex");
await writeFile(path.join(outputDir, "comparison.json"), JSON.stringify({
  status: "PASS",
  identical: true,
  componentModuleSha256: sha256,
  v3Length: outputs[0].length,
  v4Length: outputs[1].length,
}, null, 2), { flag: "wx" });
process.stdout.write(`PASS byte-identical emitted component module ${sha256}\n`);
