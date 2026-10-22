const sourceFiles = [
  "results/snake-frame-lifecycle-v1/preregistration.json",
  "results/compiler-snake-frame-ir.json",
  "snake-lifecycle-v1-benchmark.html",
  "src/browser/snake_lifecycle_v1_benchmark.tsx",
  "src/browser/snake_lifecycle_v1_schedule.ts",
  "src/browser/snake_frame_benchmark.css",
  "src/browser/generated_snake_frame_plan.ts",
  "src/jsx_binding_runtime.ts",
  "src/vdom_snapshot_runtime.ts",
  "compiler/fixtures/snake_frame_scene.tsx",
  "compiler/oxc-spike/Cargo.toml",
  "compiler/oxc-spike/Cargo.lock",
  "compiler/oxc-spike/src/main.rs",
  "scripts/run_oxc_compiler.ts",
  "scripts/create_snake_lifecycle_v1_preregistration.ts",
  "scripts/create_snake_lifecycle_v1_source_lock.ts",
  "vite.config.ts",
  "package.json",
  "pnpm-lock.yaml",
  "deno.json",
];
for await (const entry of Deno.readDir("dist")) {
  if (entry.isFile && entry.name.endsWith(".html")) {
    sourceFiles.push(`dist/${entry.name}`);
  }
}
for await (const entry of Deno.readDir("dist/assets")) {
  if (entry.isFile) sourceFiles.push(`dist/assets/${entry.name}`);
}
const files = [];
for (const file of [...new Set(sourceFiles)].sort()) {
  const bytes = await Deno.readFile(file);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  files.push({ path: file, bytes: bytes.byteLength, sha256 });
}
const lock = {
  schemaVersion: "snake-frame-lifecycle-v1-source-lock",
  status: "FROZEN_BEFORE_COLLECTION",
  generatedAt: new Date().toISOString(),
  hashAlgorithm: "SHA-256",
  preregistration: "results/snake-frame-lifecycle-v1/preregistration.json",
  includedFiles: files.length,
  compiler: {
    language: "Rust",
    generatedPlan: "src/browser/generated_snake_frame_plan.ts",
    planBindings: 2,
    reactCompiler: "babel-plugin-react-compiler@1.0.0",
  },
  environment: {
    deno: Deno.version.deno,
    v8: Deno.version.v8,
    typescript: Deno.version.typescript,
    react: "19.3.0",
  },
  files,
};
await Deno.mkdir("results/snake-frame-lifecycle-v1", { recursive: true });
await Deno.writeTextFile(
  "results/snake-frame-lifecycle-v1/source-lock.json",
  `${JSON.stringify(lock, null, 2)}\n`,
);
console.log(`Locked ${files.length} source and production bundle files.`);
