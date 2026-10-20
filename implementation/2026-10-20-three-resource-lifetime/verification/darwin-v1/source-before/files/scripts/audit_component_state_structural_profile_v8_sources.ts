const manifestPath =
  "results/component-state-structural-profile-v8-83004001-83004005-manifest.json";
const auditPath =
  "results/component-state-structural-profile-v8-source-drift-audit.json";
const manifestBytes = await Deno.readFile(manifestPath);
const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
const hash = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};

if (
  manifest.schemaVersion !==
    "component-state-structural-profile-v8-multipage-manifest" ||
  manifest.status !== "POST_COLLECTION_PINNED_DIAGNOSTIC" ||
  manifest.profiles.length !== 5 || manifest.sourceInputs.length !== 15
) {
  throw new Error("Unexpected V8 structural-profile manifest contract");
}

const profileAudit = [];
for (const profile of manifest.profiles) {
  const bytes = await Deno.readFile(profile.path);
  const actualSha256 = await hash(bytes);
  if (bytes.length !== profile.bytes || actualSha256 !== profile.sha256) {
    throw new Error(`Historical V8 raw profile failed verification: ${profile.path}`);
  }
  profileAudit.push({
    path: profile.path,
    seed: profile.seed,
    bytes: profile.bytes,
    sha256: profile.sha256,
    verified: true,
  });
}

const filesUnderResults: string[] = [];
const visit = async (directory: string) => {
  for await (const entry of Deno.readDir(directory)) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory) await visit(path);
    else if (entry.isFile) filesUnderResults.push(path);
  }
};
await visit("results");

const sourceAudit = [];
for (const source of manifest.sourceInputs) {
  const currentBytes = await Deno.readFile(source.path);
  const currentSha256 = await hash(currentBytes);
  const recoveredCopies: string[] = [];
  if (currentSha256 !== source.sha256) {
    for (const path of filesUnderResults) {
      if (path === source.path) continue;
      const info = await Deno.stat(path);
      if (info.size !== source.bytes) continue;
      if (await hash(await Deno.readFile(path)) === source.sha256) {
        recoveredCopies.push(path);
      }
    }
  }
  sourceAudit.push({
    path: source.path,
    historicalBytes: source.bytes,
    historicalSha256: source.sha256,
    currentBytes: currentBytes.length,
    currentSha256,
    currentMatchesCollection: currentSha256 === source.sha256,
    recoveredCopies,
  });
}

const audit = {
  schemaVersion: "component-state-structural-profile-v8-source-drift-audit",
  purpose:
    "Reconcile current workspace sources against the immutable post-collection manifest without rewriting that manifest.",
  originalManifest: {
    path: manifestPath,
    bytes: manifestBytes.length,
    sha256: await hash(manifestBytes),
  },
  rawProfiles: profileAudit,
  sourceInputs: sourceAudit,
  implementationInputsChanged: sourceAudit.filter((item) =>
    !item.currentMatchesCollection &&
    item.path !== "notebook_cells/component_state_structural_profile_v8.ts" &&
    item.path !==
      "scripts/update_research_notebook_component_state_structural_profile_v8.ts"
  ).map((item) => item.path),
  interpretation:
    "The raw diagnostic records are hash-verified. A current source hash match confirms the recorded file remains available. A recoveredCopies entry confirms byte-for-byte historical source content still exists in results. Missing copies do not invalidate the raw-record analysis, but prevent exact reconstruction of that part of the measured implementation.",
};
await Deno.writeTextFile(auditPath, JSON.stringify(audit, null, 2) + "\n");
console.log(
  JSON.stringify({
    auditPath,
    profilesVerified: profileAudit.length,
    sourceInputs: sourceAudit.length,
    currentSourceMatches: sourceAudit.filter((item) =>
      item.currentMatchesCollection
    ).length,
    changedSinceCollection: sourceAudit.filter((item) =>
      !item.currentMatchesCollection
    ).map((item) => item.path),
    recoveredHistoricalSources: sourceAudit.filter((item) =>
      item.recoveredCopies.length > 0
    ).map((item) => ({ path: item.path, copies: item.recoveredCopies })),
  }, null, 2),
);
