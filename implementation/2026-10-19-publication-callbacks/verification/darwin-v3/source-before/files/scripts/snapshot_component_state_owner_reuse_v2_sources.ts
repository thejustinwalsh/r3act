const lockPath = "results/component-state-owner-reuse-v2-source-lock.json";
const snapshotRoot = "results/component-state-owner-reuse-v2/source-snapshot";
const manifestPath = "results/component-state-owner-reuse-v2-source-snapshot-manifest.json";
const hash = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};
const lockBytes = await Deno.readFile(lockPath);
const lock = JSON.parse(new TextDecoder().decode(lockBytes));
if (
  lock.schemaVersion !== "component-state-owner-reuse-v2-source-lock" ||
  lock.status !== "FROZEN_BEFORE_LATENCY_COLLECTION" ||
  lock.entries.length !== 30
) throw new Error("Unexpected V2 owner-reuse source lock");

const entries = [];
for (const input of lock.entries as Array<{
  path: string;
  bytes: number;
  sha256: string;
}>) {
  const source = await Deno.readFile(input.path);
  if (source.length !== input.bytes || await hash(source) !== input.sha256) {
    throw new Error(`Live source no longer matches the V2 lock: ${input.path}`);
  }
  const destination = `${snapshotRoot}/${input.path}`;
  const directory = destination.slice(0, destination.lastIndexOf("/"));
  await Deno.mkdir(directory, { recursive: true });
  try {
    const saved = await Deno.readFile(destination);
    if (saved.length !== input.bytes || await hash(saved) !== input.sha256) {
      throw new Error(`Existing snapshot does not match V2 source lock: ${input.path}`);
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
    await Deno.writeFile(destination, source, { createNew: true });
  }
  entries.push({
    sourcePath: input.path,
    snapshotPath: destination,
    bytes: input.bytes,
    sha256: input.sha256,
  });
}
const manifest = {
  schemaVersion: "component-state-owner-reuse-v2-source-snapshot-manifest",
  status: "PASS",
  capturedAt: new Date().toISOString(),
  sourceLock: {
    path: lockPath,
    bytes: lockBytes.length,
    sha256: await hash(lockBytes),
  },
  entries,
};
await Deno.writeTextFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ manifestPath, entries: entries.length }, null, 2));
