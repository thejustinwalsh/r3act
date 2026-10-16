const filesToFreeze = [
  "results/snake-sparse-frame-v1-preregistration.json",
  "snake-sparse-frame-benchmark.html",
  "src/browser/snake_sparse_frame_benchmark.tsx",
  "src/browser/snake_sparse_v1_schedule.ts",
  "src/browser/snake_frame_benchmark.css",
  "src/browser/generated_snake_frame_plan.ts",
  "results/compiler-snake-frame-ir.json",
  "compiler/fixtures/snake_frame_scene.tsx",
  "compiler/oxc-spike/Cargo.toml",
  "compiler/oxc-spike/Cargo.lock",
  "compiler/oxc-spike/src/main.rs",
  "scripts/run_oxc_compiler.ts",
  "scripts/create_snake_sparse_v1_preregistration.ts",
  "scripts/create_snake_sparse_v1_source_lock.ts",
  "src/jsx_binding_runtime.ts",
  "src/vdom_snapshot_runtime.ts",
  "src/compiled_bindings.ts",
  "vite.config.ts",
  "package.json",
  "pnpm-lock.yaml",
  "deno.json",
  "deno.browser.json",
].sort();

const files = [];
for (const path of filesToFreeze) {
  const bytes = await Deno.readFile(path);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const snapshotPath = `results/snake-sparse-frame-v1-source-snapshot/${path}`;
  await Deno.mkdir(snapshotPath.slice(0, snapshotPath.lastIndexOf("/")), { recursive: true });
  await Deno.writeFile(snapshotPath, bytes);
  files.push({ path, snapshotPath, bytes: bytes.byteLength, sha256 });
}
const lock = {
  schemaVersion: "snake-sparse-frame-browser-v1-source-lock",
  status: "FROZEN_BEFORE_COLLECTION",
  generatedAt: new Date().toISOString(),
  hashAlgorithm: "SHA-256",
  preregistration: "results/snake-sparse-frame-v1-preregistration.json",
  includedFiles: files.length,
  environment: {
    deno: Deno.version.deno,
    v8: Deno.version.v8,
    typescript: Deno.version.typescript,
    react: "19.3.0",
    reactCompiler: "1.0.0",
    vite: "8.3.1",
  },
  files,
};
await Deno.writeTextFile("results/snake-sparse-frame-v1-source-lock.json", `${JSON.stringify(lock, null, 2)}\n`);
console.log(`Froze ${files.length} files and archived source snapshots.`);
