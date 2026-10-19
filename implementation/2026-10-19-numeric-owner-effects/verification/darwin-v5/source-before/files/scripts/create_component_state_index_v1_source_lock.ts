const paths = [
  "component-state-index-benchmark.html",
  "src/browser/component_state_index_benchmark.tsx",
  "src/browser/generated_component_state_structural.ts",
  "src/browser/generated_component_state_structural_transform.tsx",
  "src/component_state_runtime.ts",
  "src/owner_state_world.ts",
  "src/jsx_binding_runtime.ts",
  "src/vdom_snapshot_runtime.ts",
  "src/derived_region_runtime.ts",
  "compiler/fixtures/component_state_structural.tsx",
  "compiler/oxc-spike/Cargo.toml",
  "compiler/oxc-spike/Cargo.lock",
  "compiler/oxc-spike/src/main.rs",
  "scripts/run_oxc_compiler.ts",
  "results/component-state-structural-index-v1-preregistration.json",
  "results/component-state-structural-index-v1-preregistration-pre-amendment.json",
  "vite.config.ts",
  "package.json",
  "pnpm-lock.yaml",
  "deno.json",
];
const entries = [];
for (const path of paths) {
  const data = await Deno.readFile(path);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const sha256 = [...new Uint8Array(hash)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  entries.push({ path, sha256, bytes: data.length });
}
const lock = {
  schemaVersion: "component-state-structural-index-v1-source-lock",
  status: "FROZEN_BEFORE_COLLECTION",
  lockedAt: new Date().toISOString(),
  entries,
};
await Deno.writeTextFile(
  "results/component-state-structural-index-v1-source-lock.json",
  `${JSON.stringify(lock, null, 2)}\n`,
);
console.log(`Locked ${entries.length} structural index V1 inputs`);
