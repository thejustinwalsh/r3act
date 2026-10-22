const directory = "results/component-state-owner-reuse-v3";
const lockPath = `${directory}/browser-source-lock.json`;
const buildDirectory = "dist-component-state-owner-reuse-v3";
const sourcePaths = [
  `${directory}/browser-preregistration.json`,
  `${directory}/browser-preregistration-amendment-1.json`,
  "component-state-owner-reuse-v3-browser-benchmark.html",
  "src/browser/component_state_owner_reuse_v3_browser_benchmark.tsx",
  "src/browser/generated_component_state_structural.ts",
  "src/component_state_runtime_owner_reuse_v3.ts",
  "src/owner_state_world.ts",
  "src/jsx_binding_runtime.ts",
  "src/vdom_snapshot_runtime.ts",
  "src/derived_region_runtime.ts",
  "compiler/fixtures/component_state_structural.tsx",
  "vite.component_state_owner_reuse_v3.config.ts",
  "vite.config.ts",
  "package.json",
  "pnpm-lock.yaml",
  "deno.json",
  "deno.browser.json",
  "scripts/create_component_state_owner_reuse_v3_browser_source_lock.ts",
  "scripts/verify_component_state_owner_reuse_v3_browser_source_lock.ts",
];
const sha256 = async (path: string) => {
  const bytes = await Deno.readFile(path);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes.slice().buffer as ArrayBuffer,
  );
  return {
    path,
    bytes: bytes.length,
    sha256: [...new Uint8Array(digest)].map((byte) =>
      byte.toString(16).padStart(2, "0")
    ).join(""),
  };
};
const walk = async (directory: string): Promise<string[]> => {
  const files: string[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory) files.push(...await walk(path));
    else if (entry.isFile) files.push(path);
  }
  return files.sort();
};
const buildFiles = await walk(buildDirectory);
const compilerEvidencePath =
  `${buildDirectory}/react-compiler-build-evidence.json`;
const compilerEvidence = JSON.parse(
  await Deno.readTextFile(compilerEvidencePath),
);
if (
  compilerEvidence.schemaVersion !==
    "react-compiler-vite-transform-evidence-v1" ||
  compilerEvidence.sourceModule !==
    "src/browser/component_state_owner_reuse_v3_browser_benchmark.tsx" ||
  compilerEvidence.package !== "babel-plugin-react-compiler" ||
  compilerEvidence.target !== "19" ||
  compilerEvidence.compilerRuntimeImport !== true ||
  JSON.stringify(compilerEvidence.compiledComponents) !==
    JSON.stringify(["ReactApp", "ReactRow"]) ||
  compilerEvidence.memoCacheSites < 2
) throw new Error("React Compiler build evidence contract failed");
const entries = await Promise.all(sourcePaths.map(sha256));
const buildAssets = await Promise.all(buildFiles.map(sha256));
const preregistration = JSON.parse(
  await Deno.readTextFile(`${directory}/browser-preregistration.json`),
);
if (
  preregistration.schemaVersion !==
    "component-state-owner-reuse-v3-browser-preregistration-v1" ||
  preregistration.status !== "FROZEN_BEFORE_IMPLEMENTATION_AND_COLLECTION"
) throw new Error("V3 browser preregistration contract failed");
const lock = {
  schemaVersion: "component-state-owner-reuse-v3-browser-source-lock-v1",
  lockedAt: new Date().toISOString(),
  status: "FROZEN_BEFORE_PRODUCTION_PAGE_COLLECTION",
  buildDirectory,
  compilerEvidence: {
    path: compilerEvidencePath,
    ...await sha256(compilerEvidencePath),
  },
  sourceEntries: entries,
  buildAssets,
};
await Deno.writeTextFile(lockPath, JSON.stringify(lock, null, 2) + "\n");
console.log(JSON.stringify(
  {
    status: lock.status,
    sourceInputs: entries.length,
    builtAssets: buildAssets.length,
    compilerEvidence: compilerEvidencePath,
  },
  null,
  2,
));
