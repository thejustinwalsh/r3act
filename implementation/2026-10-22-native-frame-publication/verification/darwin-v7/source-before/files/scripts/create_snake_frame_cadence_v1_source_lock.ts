const sourceFiles = [
  "results/snake-frame-cadence-v1/preregistration.json",
  "snake-frame-cadence-v1-benchmark.html",
  "src/browser/snake_frame_cadence_v1_benchmark.tsx",
  "src/browser/snake_frame_cadence_v1_schedule.ts",
  "src/browser/snake_frame_benchmark.css",
  "src/browser/generated_snake_frame_plan.ts",
  "src/jsx_binding_runtime.ts",
  "src/vdom_snapshot_runtime.ts",
  "compiler/fixtures/snake_frame_scene.tsx",
  "compiler/oxc-spike/Cargo.toml",
  "compiler/oxc-spike/Cargo.lock",
  "compiler/oxc-spike/src/main.rs",
  "scripts/run_oxc_compiler.ts",
  "scripts/create_snake_frame_cadence_v1_preregistration.ts",
  "scripts/create_snake_frame_cadence_v1_schedule_module.ts",
  "scripts/create_snake_frame_cadence_v1_source_lock.ts",
  "scripts/verify_snake_frame_cadence_v1_source_lock.ts",
  "vite.config.ts",
  "package.json",
  "pnpm-lock.yaml",
  "deno.json",
];
const files = [];
for (const file of sourceFiles.sort()) {
  const bytes = await Deno.readFile(file);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  files.push({ path: file, bytes: bytes.byteLength, sha256 });
}
const assets = [];
for (const file of ["dist/snake-frame-cadence-v1-benchmark.html"]) {
  const bytes = await Deno.readFile(file);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  assets.push({
    path: file,
    bytes: bytes.byteLength,
    sha256: [...new Uint8Array(digest)].map((byte) =>
      byte.toString(16).padStart(2, "0")
    ).join(""),
  });
}
for await (const entry of Deno.readDir("dist/assets")) {
  if (!entry.isFile) continue;
  const file = `dist/assets/${entry.name}`;
  const bytes = await Deno.readFile(file);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  assets.push({
    path: file,
    bytes: bytes.byteLength,
    sha256: [...new Uint8Array(digest)].map((byte) =>
      byte.toString(16).padStart(2, "0")
    ).join(""),
  });
}
const lock = {
  schemaVersion: "snake-frame-cadence-source-lock-v1",
  status: "FROZEN_BEFORE_COLLECTION",
  createdAt: new Date().toISOString(),
  hashAlgorithm: "SHA-256",
  preregistration: "results/snake-frame-cadence-v1/preregistration.json",
  compiler: {
    language: "Rust / OXC spike",
    generatedPlan: "src/browser/generated_snake_frame_plan.ts",
    reactCompiler: "babel-plugin-react-compiler@1.0.0",
  },
  environment: {
    deno: Deno.version.deno,
    v8: Deno.version.v8,
    typescript: Deno.version.typescript,
    react: "19.3.0",
  },
  sourceFiles: files,
  productionAssets: assets.sort((a, b) => a.path.localeCompare(b.path)),
};
await Deno.writeTextFile(
  "results/snake-frame-cadence-v1/source-lock.json",
  `${JSON.stringify(lock, null, 2)}\n`,
);
console.log(
  `Locked ${files.length} source inputs and ${assets.length} production assets before collection.`,
);
