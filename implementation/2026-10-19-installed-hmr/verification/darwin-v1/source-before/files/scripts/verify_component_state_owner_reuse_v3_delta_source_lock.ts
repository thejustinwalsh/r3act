const path =
  "results/component-state-owner-reuse-v3/delta-profile-source-lock.json";
const lock = JSON.parse(await Deno.readTextFile(path));
if (
  lock.schemaVersion !==
    "component-state-owner-reuse-v3-delta-source-lock-v1" ||
  lock.status !== "FROZEN_BEFORE_FRESH_DIAGNOSTIC_REPLICATIONS" ||
  !Array.isArray(lock.entries) || lock.entries.length !== 11
) throw new Error("V3 delta source-lock metadata contract failed");
for (
  const entry of lock.entries as Array<{
    path: string;
    bytes: number;
    sha256: string;
  }>
) {
  const bytes = await Deno.readFile(entry.path);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes.slice().buffer as ArrayBuffer,
  );
  const sha256 = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  if (bytes.length !== entry.bytes || sha256 !== entry.sha256) {
    throw new Error(`V3 delta source-lock mismatch: ${entry.path}`);
  }
}
console.log(
  `Verified ${lock.entries.length} locked V3 delta diagnostic inputs`,
);
