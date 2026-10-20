const lock = JSON.parse(await Deno.readTextFile(
  "results/browser-snake-frame-v6-production-source-lock.json",
));
if (lock.status !== "FROZEN_BEFORE_COLLECTION") {
  throw new Error("V6 source lock is not frozen");
}
const hash = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};
const snapshotRoot = "results/v6-source-snapshot";
const files = [];
for (const entry of lock.files) {
  const source = await Deno.readFile(entry.path);
  if (source.byteLength !== entry.bytes || await hash(source) !== entry.sha256) {
    throw new Error(`Live source no longer matches the V6 lock: ${entry.path}`);
  }
  const path = `${snapshotRoot}/${entry.path}`;
  await Deno.mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  await Deno.writeFile(path, source);
  files.push({ path: entry.path, bytes: entry.bytes, sha256: entry.sha256 });
}
await Deno.writeTextFile(
  "results/browser-snake-frame-v6-source-snapshot-manifest.json",
  `${JSON.stringify({
    schemaVersion: "snake-frame-browser-v6-source-snapshot-manifest-v1",
    status: "PASS",
    sourceLock: "browser-snake-frame-v6-production-source-lock.json",
    snapshotRoot,
    fileCount: files.length,
    files,
  }, null, 2)}\n`,
);
console.log(`Archived ${files.length} exact V6 source files.`);
