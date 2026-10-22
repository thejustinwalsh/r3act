const sourcePath = "src/compiled_bindings.ts";
const source = await Deno.readFile(sourcePath);
const stat = await Deno.stat(sourcePath);
if (!stat.mtime) throw new Error("Cannot establish dependency modification time");
const digest = await crypto.subtle.digest("SHA-256", source);
const sha256 = [...new Uint8Array(digest)].map((byte) =>
  byte.toString(16).padStart(2, "0")
).join("");
const dependency = {
  sourcePath,
  snapshotPath: "src/compiled_bindings.ts",
  bytes: source.byteLength,
  sha256,
  modifiedAt: stat.mtime.toISOString(),
  note: "Transitive import of jsx_binding_runtime.ts; added as an immutable supplement after the source-lock import audit.",
};
const studies = [
  {
    lock: "results/browser-snake-frame-v6-production-source-lock.json",
    prereg: "results/browser-snake-frame-v6-production-preregistration.json",
    root: "results/v6-source-snapshot",
    manifest: "results/browser-snake-frame-v6-source-snapshot-manifest.json",
  },
  {
    lock: "results/columnar-dispatch-v1-source-lock.json",
    prereg: "results/columnar-dispatch-v1-preregistration.json",
    root: "results/columnar-dispatch-v1/source-snapshot",
    manifest: "results/columnar-dispatch-v1-source-snapshot-manifest.json",
  },
];
for (const study of studies) {
  const schedule = JSON.parse(await Deno.readTextFile(study.prereg));
  const frozenAt = schedule.frozenAt;
  if (!frozenAt || stat.mtime.getTime() > Date.parse(frozenAt)) {
    throw new Error(`Dependency changed after preregistration: ${study.prereg}`);
  }
  const path = `${study.root}/${dependency.snapshotPath}`;
  await Deno.mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true });
  await Deno.writeFile(path, source);
  const snapshotManifest = JSON.parse(await Deno.readTextFile(study.manifest));
  snapshotManifest.supplementalDependencies = [dependency];
  await Deno.writeTextFile(study.manifest, `${JSON.stringify(snapshotManifest, null, 2)}\n`);
}
console.log(`Archived transitive dependency ${sourcePath} (SHA-256 ${sha256}).`);
