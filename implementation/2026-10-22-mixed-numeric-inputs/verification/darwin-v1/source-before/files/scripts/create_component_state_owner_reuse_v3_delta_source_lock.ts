const paths = [
  "results/component-state-owner-reuse-v3/delta-profile-preregistration.json",
  "scripts/profile_component_state_owner_reuse_v3_delta.ts",
  "scripts/create_component_state_owner_reuse_v3_delta_source_lock.ts",
  "scripts/verify_component_state_owner_reuse_v3_delta_source_lock.ts",
  "src/component_state_runtime_owner_reuse_v3.ts",
  "src/owner_state_world.ts",
  "src/jsx_binding_runtime.ts",
  "src/vdom_snapshot_runtime.ts",
  "src/derived_region_runtime.ts",
  "deno.json",
  "deno.browser.json",
];
const entries = await Promise.all(paths.map(async (path) => {
  const bytes = await Deno.readFile(path);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes.slice().buffer as ArrayBuffer,
  );
  const sha256 = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return { path, bytes: bytes.length, sha256 };
}));
const lock = {
  schemaVersion: "component-state-owner-reuse-v3-delta-source-lock-v1",
  lockedAt: new Date().toISOString(),
  status: "FROZEN_BEFORE_FRESH_DIAGNOSTIC_REPLICATIONS",
  preregistration:
    "results/component-state-owner-reuse-v3/delta-profile-preregistration.json",
  entries,
};
await Deno.writeTextFile(
  "results/component-state-owner-reuse-v3/delta-profile-source-lock.json",
  JSON.stringify(lock, null, 2) + "\n",
);
console.log(
  JSON.stringify({ status: lock.status, entryCount: entries.length }, null, 2),
);
