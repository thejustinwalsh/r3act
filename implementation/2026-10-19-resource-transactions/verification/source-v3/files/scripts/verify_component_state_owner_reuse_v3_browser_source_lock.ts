const lockPath =
  "results/component-state-owner-reuse-v3/browser-source-lock.json";
const lock = JSON.parse(await Deno.readTextFile(lockPath));
if (
  lock.schemaVersion !==
    "component-state-owner-reuse-v3-browser-source-lock-v1" ||
  lock.status !== "FROZEN_BEFORE_PRODUCTION_PAGE_COLLECTION" ||
  !Array.isArray(lock.sourceEntries) || lock.sourceEntries.length !== 19 ||
  !Array.isArray(lock.buildAssets) || lock.buildAssets.length === 0 ||
  lock.compilerEvidence?.path !==
    `${lock.buildDirectory}/react-compiler-build-evidence.json`
) throw new Error("V3 browser source-lock metadata contract failed");
const hash = async (path: string) => {
  const bytes = await Deno.readFile(path);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes.slice().buffer as ArrayBuffer,
  );
  return {
    bytes: bytes.length,
    sha256: [...new Uint8Array(digest)].map((byte) =>
      byte.toString(16).padStart(2, "0")
    ).join(""),
  };
};
for (
  const entry of [...lock.sourceEntries, ...lock.buildAssets] as Array<{
    path: string;
    bytes: number;
    sha256: string;
  }>
) {
  const actual = await hash(entry.path);
  if (actual.bytes !== entry.bytes || actual.sha256 !== entry.sha256) {
    throw new Error(`V3 browser source-lock mismatch: ${entry.path}`);
  }
}
const compilerEvidence = JSON.parse(
  await Deno.readTextFile(lock.compilerEvidence.path),
);
if (
  compilerEvidence.schemaVersion !==
    "react-compiler-vite-transform-evidence-v1" ||
  compilerEvidence.package !== "babel-plugin-react-compiler" ||
  compilerEvidence.target !== "19" ||
  compilerEvidence.compilerRuntimeImport !== true ||
  JSON.stringify(compilerEvidence.compiledComponents) !==
    JSON.stringify(["ReactApp", "ReactRow"]) ||
  compilerEvidence.memoCacheSites < 2
) throw new Error("V3 React Compiler transform evidence failed");
console.log(
  `Verified ${lock.sourceEntries.length} V3 browser source inputs, ${lock.buildAssets.length} production assets, and memo-cache lowering for ReactApp/ReactRow`,
);
