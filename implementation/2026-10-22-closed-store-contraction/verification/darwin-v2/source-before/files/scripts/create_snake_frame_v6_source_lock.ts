const filesToFreeze = [
  "results/browser-snake-frame-v6-production-preregistration.json",
  "results/compiler-snake-frame-ir.json",
  "snake-frame-benchmark.html",
  "src/browser/snake_frame_benchmark.tsx",
  "src/browser/snake_frame_benchmark.css",
  "src/browser/snake_frame_v6_schedule.ts",
  "src/browser/generated_snake_frame_plan.ts",
  "src/jsx_binding_runtime.ts",
  "src/vdom_snapshot_runtime.ts",
  "src/vdom_snapshot_runtime_test.ts",
  "compiler/fixtures/snake_frame_scene.tsx",
  "compiler/oxc-spike/Cargo.toml",
  "compiler/oxc-spike/Cargo.lock",
  "compiler/oxc-spike/src/main.rs",
  "scripts/run_oxc_compiler.ts",
  "scripts/create_snake_frame_v6_production_schedule.ts",
  "scripts/create_snake_frame_v6_production_manifest.ts",
  "vite.config.ts",
  "package.json",
  "pnpm-lock.yaml",
  "deno.json",
].sort();
const frozen = [];
for (const file of filesToFreeze) {
  const bytes = await Deno.readFile(file);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  frozen.push({ path: file, bytes: bytes.byteLength, sha256 });
}
const lock = {
  schemaVersion: "snake-frame-browser-v6-source-lock-v1",
  status: "FROZEN_BEFORE_COLLECTION",
  generatedAt: new Date().toISOString(),
  hashAlgorithm: "SHA-256",
  preregistration: "results/browser-snake-frame-v6-production-preregistration.json",
  includedFiles: frozen.length,
  environment: {
    deno: Deno.version.deno,
    v8: Deno.version.v8,
    typescript: Deno.version.typescript,
    react: "19.3.0",
    reactCompiler: "1.0.0",
  },
  files: frozen,
};
await Deno.writeTextFile(
  "results/browser-snake-frame-v6-production-source-lock.json",
  `${JSON.stringify(lock, null, 2)}\n`,
);
console.log(`Wrote V6 production source lock for ${frozen.length} files.`);
