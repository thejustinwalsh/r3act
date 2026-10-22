const paths = [
  "component-state-owner-reuse-v2-benchmark.html",
  "src/browser/component_state_owner_reuse_v2_benchmark.tsx",
  "src/browser/generated_component_state_structural.ts",
  "src/browser/generated_component_state_structural_transform.tsx",
  "src/component_state_runtime.ts",
  "src/component_state_runtime_test.ts",
  "src/owner_state_world.ts",
  "src/jsx_binding_runtime.ts",
  "src/vdom_snapshot_runtime.ts",
  "src/derived_region_runtime.ts",
  "compiler/fixtures/component_state_structural.tsx",
  "compiler/oxc-spike/Cargo.toml",
  "compiler/oxc-spike/Cargo.lock",
  "compiler/oxc-spike/src/main.rs",
  "scripts/run_oxc_compiler.ts",
  "scripts/run_component_state_structural_compiler.ts",
  "scripts/create_component_state_owner_reuse_v2_preregistration.ts",
  "scripts/create_component_state_owner_reuse_v2_source_lock.ts",
  "scripts/verify_component_state_owner_reuse_v2_source_lock.ts",
  "results/component-state-owner-reuse-v2-preregistration.json",
  "results/component-state-owner-reuse-v2-amendment-01.json",
  "results/component-state-owner-reuse-v2-amendment-02.json",
  "results/component-state-owner-reuse-v2-amendment-03.json",
  "results/component-state-owner-reuse-v2-amendment-04.json",
  "results/component-state-owner-reuse-v2-amendment-05.json",
  "vite.config.ts",
  "package.json",
  "pnpm-lock.yaml",
  "deno.json",
  "deno.browser.json",
];
const entries = [];
for (const path of paths) {
  const data = await Deno.readFile(path);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const sha256 = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  entries.push({ path, sha256, bytes: data.length });
}
const lock = {
  schemaVersion: "component-state-owner-reuse-v2-source-lock",
  status: "FROZEN_BEFORE_LATENCY_COLLECTION",
  lockedAt: new Date().toISOString(),
  preregistration: "results/component-state-owner-reuse-v2-preregistration.json",
  amendment: "results/component-state-owner-reuse-v2-amendment-01.json",
  additionalAmendment: "results/component-state-owner-reuse-v2-amendment-02.json",
  implementationAmendment: "results/component-state-owner-reuse-v2-amendment-03.json",
  correctnessAmendment: "results/component-state-owner-reuse-v2-amendment-04.json",
  archiveAmendment: "results/component-state-owner-reuse-v2-amendment-05.json",
  entries,
};
await Deno.writeTextFile(
  "results/component-state-owner-reuse-v2-source-lock.json",
  `${JSON.stringify(lock, null, 2)}\n`,
);
console.log(`Locked ${entries.length} owner-reuse V2 source/build inputs`);
