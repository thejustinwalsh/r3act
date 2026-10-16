import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { nativeModulePlugin } from "../../../../compiler/vite_native_plugin.ts";

const stage = fileURLToPath(new URL("./", import.meta.url));
const root = fileURLToPath(new URL("../../../../", import.meta.url));
const liveSrc = path.join(root, "src") + path.sep;
const snapshotSrc = path.join(stage, "../snapshot/src") + path.sep;
const binary = path.join(root,
  ".cache/structural-locality-protocol-v1/eligibility/cargo-target/debug/ui-graph-compiler-spike");
const captured = new Map<string, string>();
const buildEndErrors: unknown[] = [];
const closeBundleErrors: unknown[] = [];
const captureErrors: string[] = [];
let proofWrite: Promise<void> | undefined;
let originalErrorWrite: Promise<void> | undefined;
const sha = (code: string) => createHash("sha256").update(code).digest("hex");
const describe = (error: any) => ({ message: error?.message ?? String(error),
  stack: error?.stack ?? null, plugin: error?.plugin ?? null,
  code: error?.code ?? null, hook: error?.hook ?? null });
const snapshotAlias: Plugin = { name: "structural-snapshot-only-src", enforce: "pre",
  resolveId(source, importer) {
    const cleaned = source.split("?", 1)[0];
    let absolute: string | null = null;
    if (cleaned.startsWith(liveSrc)) absolute = cleaned;
    else if (cleaned.startsWith("/src/")) absolute = path.join(root, cleaned.slice(1));
    else if (importer && cleaned.startsWith("."))
      absolute = path.resolve(path.dirname(importer.split("?", 1)[0]), cleaned);
    if (absolute?.startsWith(liveSrc))
      return snapshotSrc + absolute.slice(liveSrc.length);
    return null;
  },
};
const nativeNames = new Set(["native_collection.tsx", "native_generic.tsx", "native_controller.tsx"]);
const captureNative: Plugin = { name: "structural-diagnostic-native-capture", enforce: "pre",
  transform(code, id) {
    const name = path.basename(id.split("?", 1)[0]);
    if (nativeNames.has(name)) captured.set(name, code);
    return null;
  },
};
const captureReact: Plugin = { name: "structural-diagnostic-react-capture", enforce: "post",
  transform(code, id) {
    const name = path.basename(id.split("?", 1)[0]);
    if (name === "react_array.tsx" || name === "entry.ts") captured.set(name, code);
    return null;
  },
  buildEnd(error) {
    if (!error) return;
    const diagnostic = describe(error);
    buildEndErrors.push(diagnostic);
    if (!originalErrorWrite) originalErrorWrite = (async () => {
      const proof = path.join(stage, "proof");
      await mkdir(proof, { recursive: true });
      await writeFile(path.join(proof, "original-build-error.json"),
        JSON.stringify(diagnostic, null, 2) + "\n", { flag: "wx" });
    })().catch((writeError) => {
      captureErrors.push(`original error receipt ${String(writeError)}`);
    });
    return originalErrorWrite;
  },
  closeBundle(...args: unknown[]) {
    if (args[0]) closeBundleErrors.push(describe(args[0]));
    if (!proofWrite) proofWrite = (async () => {
      const proof = path.join(stage, "proof");
      await mkdir(proof, { recursive: true });
      await originalErrorWrite;
      const entries = [...captured].sort(([a], [b]) => a.localeCompare(b));
      for (const [name, code] of entries) {
        try { await writeFile(path.join(proof, `${name}.emitted.txt`), code, { flag: "wx" }); }
        catch (error) { captureErrors.push(`${name}: ${String(error)}`); }
      }
      await writeFile(path.join(proof, "hook-report.json"), JSON.stringify({
        schemaVersion: "structural-diagnostic-frontend-hook-v1",
        buildEndErrors, closeBundleErrors,
        captures: entries.map(([name, code]) => ({ name, sha256: sha(code) })), captureErrors,
      }, null, 2) + "\n", { flag: "wx" });
      if (captureErrors.length && buildEndErrors.length === 0 && closeBundleErrors.length === 0)
        throw new Error(`capture failed ${captureErrors.join("; ")}`);
    })();
    return proofWrite;
  },
};
export default defineConfig({
  root,
  plugins: [snapshotAlias,
    nativeModulePlugin({ root, compilerRoot: root, compilerBinary: binary }), captureNative,
    react({
      exclude: /\/(?:eligibility\/(?:native_collection|native_generic)|frontend\/native_controller)\.tsx(?:\?.*)?$/,
      babel: (id) => ({ plugins: id.endsWith("/eligibility/react_array.tsx")
        ? [["babel-plugin-react-compiler", { target: "19" }]] : [] }),
    }), captureReact],
  build: { outDir: path.join(stage, "dist"), emptyOutDir: false, minify: false,
    sourcemap: true, rollupOptions: { input: path.join(stage, "index.html") } },
});
