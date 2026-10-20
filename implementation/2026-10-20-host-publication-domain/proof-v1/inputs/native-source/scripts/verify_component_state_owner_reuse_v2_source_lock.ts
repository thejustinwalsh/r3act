const lock = JSON.parse(
  await Deno.readTextFile("results/component-state-owner-reuse-v2-source-lock.json"),
);
if (
  lock.schemaVersion !== "component-state-owner-reuse-v2-source-lock" ||
  lock.status !== "FROZEN_BEFORE_LATENCY_COLLECTION" ||
  !Array.isArray(lock.entries) || lock.entries.length !== 30
) {
  throw new Error("Invalid owner-reuse V2 source lock");
}
const drift: string[] = [];
for (const entry of lock.entries) {
  const data = await Deno.readFile(entry.path);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const sha256 = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  if (sha256 !== entry.sha256 || data.length !== entry.bytes) drift.push(entry.path);
}
if (drift.length) throw new Error(`Owner-reuse V2 source drift: ${drift.join(", ")}`);
console.log(`Verified ${lock.entries.length} locked owner-reuse V2 inputs`);
