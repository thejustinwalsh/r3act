const lock = JSON.parse(await Deno.readTextFile(
  "results/columnar-dispatch-v1-source-lock.json",
));
const hash = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};
const snapshotRoot = "results/columnar-dispatch-v1/source-snapshot";
const files = [];
for (const entry of lock.files) {
  const source = await Deno.readFile(entry.path);
  if (source.byteLength !== entry.bytes || await hash(source) !== entry.sha256) {
    throw new Error(`Source differs from frozen lock: ${entry.path}`);
  }
  const path = `${snapshotRoot}/${entry.path}`;
  await Deno.mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  await Deno.writeFile(path, source);
  files.push({ path: entry.path, bytes: entry.bytes, sha256: entry.sha256 });
}
await Deno.writeTextFile(
  "results/columnar-dispatch-v1-source-snapshot-manifest.json",
  `${JSON.stringify({
    schemaVersion: "columnar-dispatch-v1-source-snapshot-manifest",
    status: "PASS",
    snapshotRoot,
    files,
  }, null, 2)}\n`,
);
console.log(`Archived ${files.length} exact columnar-dispatch source files.`);
