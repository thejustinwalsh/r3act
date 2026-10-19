const manifestPath = "results/component-state-structural-index-v1-manifest.json";
const auditPath = "results/component-state-structural-index-v1-source-drift-audit.json";
const manifestBytes = await Deno.readFile(manifestPath);
const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
const hash = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};
if (
  manifest.schemaVersion !== "component-state-structural-index-v1-manifest" ||
  manifest.status !== "PASS" || manifest.acceptedPages !== 5 ||
  manifest.totalMeasuredPairs !== 360
) throw new Error("Unexpected structural index V1 manifest contract");

const paths: string[] = [];
const visit = async (directory: string) => {
  for await (const entry of Deno.readDir(directory)) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory) await visit(path);
    else if (entry.isFile) paths.push(path);
  }
};
await visit("results");

const inputs = [];
let verifiedPages = 0;
for (const input of manifest.inputs) {
  const bytes = await Deno.readFile(input.path);
  const currentSha256 = await hash(bytes);
  const isAcceptedPage = input.path.startsWith(
    "results/component-state-structural-index-v1/browser-component-state-structural-index-v1-",
  );
  const matchesCollection = bytes.length === input.bytes &&
    currentSha256 === input.sha256;
  if (isAcceptedPage && !matchesCollection) {
    throw new Error(`Accepted raw page failed hash verification: ${input.path}`);
  }
  if (isAcceptedPage) verifiedPages++;
  const recoveredCopies: string[] = [];
  if (!matchesCollection) {
    for (const path of paths) {
      if (path === input.path || (await Deno.stat(path)).size !== input.bytes) continue;
      if (await hash(await Deno.readFile(path)) === input.sha256) {
        recoveredCopies.push(path);
      }
    }
  }
  inputs.push({
    path: input.path,
    historicalBytes: input.bytes,
    historicalSha256: input.sha256,
    currentBytes: bytes.length,
    currentSha256,
    currentMatchesCollection: matchesCollection,
    acceptedRawPage: isAcceptedPage,
    recoveredCopies,
  });
}
if (verifiedPages !== 5) throw new Error(`Expected 5 verified pages; saw ${verifiedPages}`);
const audit = {
  schemaVersion: "component-state-structural-index-v1-source-drift-audit",
  purpose:
    "Reconcile current workspace sources against the immutable post-collection manifest without rewriting that manifest.",
  originalManifest: {
    path: manifestPath,
    bytes: manifestBytes.length,
    sha256: await hash(manifestBytes),
  },
  verifiedAcceptedRawPages: verifiedPages,
  inputs,
  interpretation:
    "Accepted raw-page records are hash-verified. Current source mismatches are reported separately; recoveredCopies proves an exact source copy remains available. Historical source drift does not alter descriptive analysis of the verified records, but missing source copies prevent exact reconstruction of the measured implementation.",
};
await Deno.writeTextFile(auditPath, JSON.stringify(audit, null, 2) + "\n");
console.log(JSON.stringify({
  auditPath,
  verifiedAcceptedRawPages: verifiedPages,
  currentInputMatches: inputs.filter((item) => item.currentMatchesCollection).length,
  changed: inputs.filter((item) => !item.currentMatchesCollection).map((item) => item.path),
  recoverable: inputs.filter((item) => item.recoveredCopies.length).map((item) => ({path:item.path,copies:item.recoveredCopies})),
}, null, 2));
