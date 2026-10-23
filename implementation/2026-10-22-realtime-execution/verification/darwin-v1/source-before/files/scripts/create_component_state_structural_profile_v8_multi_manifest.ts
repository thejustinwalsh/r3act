const seeds = [83004001, 83004002, 83004003, 83004004, 83004005] as const;
const profilePaths = seeds.map((seed) =>
  `results/browser-component-state-structural-profile-v8-${seed}.json`
);
const sourcePaths = [
  "component-state-structural-phase-diagnostic.html",
  "compiler/fixtures/component_state_structural.tsx",
  "deno.json",
  "notebook_cells/component_state_structural_profile_v8.ts",
  "package.json",
  "scripts/create_component_state_structural_profile_v8_multi_manifest.ts",
  "scripts/update_research_notebook_component_state_structural_profile_v8.ts",
  "src/browser/component_state_structural_benchmark.tsx",
  "src/browser/generated_component_state_structural.ts",
  "src/browser/generated_component_state_structural_transform.tsx",
  "src/browser/structural_phase_profile_panel.ts",
  "src/component_state_runtime.ts",
  "src/jsx_binding_runtime.ts",
  "src/vdom_snapshot_runtime.ts",
  "vite.config.ts",
];

const sha256 = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};

const profiles = [];
for (const [index, path] of profilePaths.entries()) {
  const bytes = await Deno.readFile(path);
  const profile = JSON.parse(new TextDecoder().decode(bytes));
  if (
    profile.schemaVersion !==
      "component-state-structural-browser-phase-profile-v8" ||
    profile.seed !== seeds[index] || profile.count !== 10_000 ||
    profile.operations?.length !== 3 ||
    profile.operations.some((operation: any) =>
      operation.measuredUpdates !== 24 || operation.samples?.length !== 24
    )
  ) {
    throw new Error(`Unexpected diagnostic profile contract: ${path}`);
  }
  profiles.push({
    path,
    seed: profile.seed,
    collectedAt: profile.collectedAt,
    bytes: bytes.length,
    sha256: await sha256(bytes),
  });
}

const inputs = [];
for (const path of sourcePaths) {
  const bytes = await Deno.readFile(path);
  inputs.push({ path, bytes: bytes.length, sha256: await sha256(bytes) });
}
const manifest = {
  schemaVersion: "component-state-structural-profile-v8-multipage-manifest",
  status: "POST_COLLECTION_PINNED_DIAGNOSTIC",
  interpretation:
    "Five visible-page diagnostic records collected after the earlier stateful keyed-index study. This is not preregistered or an independent device/profile replication; timings include instrumentation and development-server overhead and must not be compared with production latency records.",
  seeds,
  count: 10_000,
  browser: "Chrome 154 on MacIntel; one physical machine and browser profile",
  pageCount: profiles.length,
  profiles,
  sourceInputs: inputs,
};
const output =
  "results/component-state-structural-profile-v8-83004001-83004005-manifest.json";
await Deno.writeTextFile(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Pinned ${profiles.length} profiles and ${inputs.length} analysis/source files: ${output}`);
