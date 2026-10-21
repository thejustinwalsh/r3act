import { gzipSync } from "node:zlib";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "vite";

const root = resolve(import.meta.dirname, "..");
const outputRoot = resolve(root, "work/runtime-size-v1");
const resultsPath = resolve(root, "results/runtime-size-v1.json");
const rootPackage = JSON.parse(
  await readFile(resolve(root, "package.json"), "utf8"),
);
const entries = {
  react: resolve(root, "src/size-fixtures/react-counter.ts"),
  runtime: resolve(root, "src/size-fixtures/runtime-counter.ts"),
};

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
const arms = {};
for (const [arm, entry] of Object.entries(entries)) {
  const outDir = resolve(outputRoot, arm);
  await build({
    configFile: false,
    root,
    logLevel: "warn",
    define: { "process.env.NODE_ENV": '"production"' },
    build: {
      lib: { entry, formats: ["es"], fileName: "app" },
      outDir,
      emptyOutDir: true,
      minify: "oxc",
      sourcemap: false,
      target: "es2022",
      rollupOptions: { external: [] },
    },
  });
  const files = [];
  for (const name of ["app.js"]) {
    const bytes = await readFile(resolve(outDir, name));
    files.push({
      name,
      bytes: bytes.length,
      gzipBytes: gzipSync(bytes, { level: 9 }).length,
    });
  }
  arms[arm] = { files, totalBytes: files.reduce((n, f) => n + f.bytes, 0) };
  arms[arm].totalGzipBytes = files.reduce((n, f) => n + f.gzipBytes, 0);
}

const result = {
  schemaVersion: "runtime-bundle-size-v1",
  status: "PASS",
  collectedAt: new Date().toISOString(),
  method:
    "Separate Vite library builds with identical target, minifier, and single-file output; gzip level 9. Both apps mount one button counter and update its text from native click state.",
  toolchain: {
    node: process.version,
    vite: rootPackage.devDependencies.vite,
    react: rootPackage.dependencies.react,
    reactDom: rootPackage.dependencies["react-dom"],
    minifier: "Oxc",
    target: "ES2022",
  },
  runtimeGzipReductionPercent: Math.round(
    (1 - arms.runtime.totalGzipBytes / arms.react.totalGzipBytes) * 1000,
  ) / 10,
  limitations: [
    "This measures a minimal counter, not a representative application or equivalent feature coverage.",
    "The prototype omits most React features; this result cannot establish equal-capability size.",
    "Build output includes the app entry and all reachable runtime/library code; source maps are excluded.",
  ],
  arms,
};
await writeFile(resultsPath, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
