const profilePath =
  "results/browser-component-state-structural-profile-v8-83004001.json";
const sourcePaths = [
  "component-state-structural-phase-diagnostic.html",
  "compiler/fixtures/component_state_structural.tsx",
  "deno.json",
  "notebook_cells/component_state_structural_profile_v8.ts",
  "package.json",
  "scripts/create_component_state_structural_profile_v8_manifest.ts",
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

const profileBytes = await Deno.readFile(profilePath);
const profile = JSON.parse(new TextDecoder().decode(profileBytes));
if (
  profile.schemaVersion !==
    "component-state-structural-browser-phase-profile-v8" ||
  profile.seed !== 83004001 || profile.count !== 10_000 ||
  profile.operations?.length !== 3 ||
  profile.operations.some((operation: any) =>
    operation.measuredUpdates !== 24 || operation.samples?.length !== 24
  )
) {
  throw new Error("Unexpected diagnostic profile contract");
}

const inputs = [];
for (const path of [...sourcePaths, profilePath]) {
  const bytes = await Deno.readFile(path);
  inputs.push({ path, bytes: bytes.length, sha256: await sha256(bytes) });
}
const manifest = {
  schemaVersion: "component-state-structural-profile-v8-manifest",
  status: "POST_COLLECTION_PINNED_DIAGNOSTIC",
  interpretation:
    "Exploratory single-page diagnostic. This manifest pins the collected record and current measurement sources after collection; it is not a preregistration or an independent replication.",
  seed: profile.seed,
  count: profile.count,
  collectedAt: profile.collectedAt,
  inputs,
};
await Deno.writeTextFile(
  "results/component-state-structural-profile-v8-83004001-manifest.json",
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(
  `Pinned ${inputs.length} inputs for diagnostic seed ${profile.seed}`,
);
