const files = [
  "deno.browser.json",
  "results/columnar-dispatch-v1-preregistration.json",
  "scripts/benchmark_columnar_dispatch_v1.ts",
  "scripts/create_columnar_dispatch_v1_preregistration.ts",
  "scripts/create_columnar_dispatch_v1_source_lock.ts",
  "src/jsx_binding_runtime.ts",
  "src/vdom_snapshot_runtime.ts",
  "src/vdom_snapshot_runtime_test.ts",
].sort();
const entries = [];
for (const path of files) {
  const bytes = await Deno.readFile(path);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = [...new Uint8Array(digest)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  entries.push({ path, bytes: bytes.byteLength, sha256 });
}
await Deno.writeTextFile(
  "results/columnar-dispatch-v1-source-lock.json",
  `${JSON.stringify({
    schemaVersion: "columnar-dispatch-v1-source-lock",
    status: "FROZEN_BEFORE_COLLECTION",
    frozenAt: new Date().toISOString(),
    preregistration: "columnar-dispatch-v1-preregistration.json",
    environment: {
      deno: Deno.version.deno,
      v8: Deno.version.v8,
      typescript: Deno.version.typescript,
    },
    files: entries,
  }, null, 2)}\n`,
);
console.log(`Froze ${entries.length} columnar dispatch source files.`);
