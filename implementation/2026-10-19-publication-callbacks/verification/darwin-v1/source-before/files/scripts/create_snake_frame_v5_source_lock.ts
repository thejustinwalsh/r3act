const production = Deno.args.includes("--production");
const outputPath = production
  ? "results/browser-snake-frame-v5-production-source-lock.json"
  : "results/browser-snake-frame-v5-source-lock.json";
const replaceExisting = Deno.args.includes("--replace");
let outputExists = true;
try {
  await Deno.stat(outputPath);
} catch (error) {
  if (error instanceof Deno.errors.NotFound) outputExists = false;
  else throw error;
}

const frozenFiles = [
  production
    ? "results/browser-snake-frame-v5-production-preregistration.json"
    : "results/browser-snake-frame-v5-preregistration.json",
  "results/compiler-snake-frame-ir.json",
  "snake-frame-benchmark.html",
  "src/browser/snake_frame_benchmark.tsx",
  "src/browser/snake_frame_benchmark.css",
  "src/browser/snake_frame_v5_schedule.ts",
  "src/browser/generated_snake_frame_plan.ts",
  "src/jsx_binding_runtime.ts",
  "src/vdom_snapshot_runtime.ts",
  "compiler/fixtures/snake_frame_scene.tsx",
  "compiler/oxc-spike/Cargo.toml",
  "compiler/oxc-spike/Cargo.lock",
  "compiler/oxc-spike/src/main.rs",
  "scripts/run_oxc_compiler.ts",
  "scripts/create_snake_frame_v5_schedule.ts",
  "vite.config.ts",
  "package.json",
  "pnpm-lock.yaml",
  "deno.json",
].sort();

const files = [];
for (const filePath of frozenFiles) {
  const bytes = await Deno.readFile(filePath);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  files.push({ path: filePath, bytes: bytes.byteLength, sha256 });
}

const lock = {
  schemaVersion: production
    ? "snake-frame-browser-v5-production-source-lock-v1"
    : "snake-frame-browser-v5-source-lock-v1",
  status: "FROZEN_BEFORE_COLLECTION",
  generatedAt: new Date().toISOString(),
  hashAlgorithm: "SHA-256",
  schedule: production
    ? "results/browser-snake-frame-v5-production-preregistration.json"
    : "results/browser-snake-frame-v5-preregistration.json",
  includedFiles: files.length,
  excludedPilot: {
    trialId: "v5-binding-smoke",
    measuredFrames: 60,
    status:
      "contract-only; outside preregistered schedule; excluded from analysis; old route rejected archive and isolated amended route saved it",
  },
  environment: {
    deno: Deno.version.deno,
    v8: Deno.version.v8,
    typescript: Deno.version.typescript,
    react: "19.3.0",
    reactCompiler: "1.0.0",
  },
  files,
};

if (outputExists && !replaceExisting) {
  const existing = JSON.parse(await Deno.readTextFile(outputPath));
  const matches = existing.schemaVersion === lock.schemaVersion &&
    existing.status === lock.status && existing.schedule === lock.schedule &&
    JSON.stringify(existing.environment) === JSON.stringify(lock.environment) &&
    JSON.stringify(existing.files) === JSON.stringify(lock.files);
  if (!matches) {
    throw new Error(
      `V5 source drift detected; review the changes, then use the amendment task before collection`,
    );
  }
  console.log(`V5 source lock verified: ${files.length} files match ${outputPath}`);
} else {
  await Deno.writeTextFile(outputPath, `${JSON.stringify(lock, null, 2)}\n`);
  console.log(
    `Wrote V5 source lock: ${files.length} files, ${outputPath}`,
  );
}
