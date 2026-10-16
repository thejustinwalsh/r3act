import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { nativeModulePlugin } from "../../../../compiler/vite_native_plugin.ts";

const stage = fileURLToPath(new URL("./", import.meta.url));
const root = fileURLToPath(new URL("../../../../", import.meta.url));
const binary = path.join(stage, "../cargo-target/debug/ui-graph-compiler-spike");
const captured = new Map<string, string>();
const buildEndErrors: Array<Record<string, string | null>> = [];
const closeBundleErrors: Array<Record<string, string | null>> = [];
const captureErrors: string[] = [];
let proofWrite: Promise<void> | undefined;
let originalErrorWrite: Promise<void> | undefined;
const hash = (code: string) => createHash("sha256").update(code).digest("hex");
const describe = (error: unknown) => {
  const values = error as Error & { plugin?: string; code?: string; pluginCode?: string; hook?: string };
  return { message: values?.message ?? String(error), stack: values?.stack ?? null,
    plugin: values.plugin ?? null, code: values.code ?? null,
    pluginCode: values.pluginCode ?? null, hook: values.hook ?? null };
};
const nativeNames = new Set(["native_collection.tsx", "native_generic.tsx", "native_controller.tsx"]);
const captureNative: Plugin = { name: "runtime-gate-native-capture", enforce: "pre",
  transform(code, id) {
    const name = path.basename(id.split("?", 1)[0]);
    if (nativeNames.has(name)) captured.set(name, code);
    return null;
  },
};
const captureReact: Plugin = { name: "runtime-gate-react-capture", enforce: "post",
  transform(code, id) {
    const name = path.basename(id.split("?", 1)[0]);
    if (name === "react_array.tsx" || name === "react_controller.tsx") captured.set(name, code);
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
      captureErrors.push(`original build error receipt: ${String(writeError)}`);
    });
    return originalErrorWrite;
  },
  closeBundle(...args: unknown[]) {
    if (args[0]) closeBundleErrors.push(describe(args[0]));
    if (!proofWrite) proofWrite = (async () => {
      const proof = path.join(stage, "proof");
      await mkdir(proof, { recursive: true });
      const entries = [...captured].sort(([a], [b]) => a.localeCompare(b));
      await originalErrorWrite;
      for (const [name, code] of entries) {
        try { await writeFile(path.join(proof, `${name}.emitted.txt`), code, { flag: "wx" }); }
        catch (error) { captureErrors.push(`${name}: ${String(error)}`); }
      }
      await writeFile(path.join(proof, "hook-report.json"), JSON.stringify({
        schemaVersion: "structural-runtime-gate-v2-hook-report",
        buildEndErrors, closeBundleErrors,
        captures: entries.map(([name, code]) => ({ name, sha256: hash(code) })),
        captureErrors,
      }, null, 2) + "\n", { flag: "wx" });
      if (captureErrors.length && buildEndErrors.length === 0 && closeBundleErrors.length === 0)
        throw new Error(`capture proof failed: ${captureErrors.join("; ")}`);
    })();
    return proofWrite;
  },
};
export default defineConfig({
  root,
  plugins: [nativeModulePlugin({ root, compilerRoot: root, compilerBinary: binary }),
    captureNative,
    react({
      exclude: /\/(?:eligibility\/(?:native_collection|native_generic)|runtime-gate-v2\/native_controller)\.tsx(?:\?.*)?$/,
      babel: (id) => ({ plugins: id.endsWith("/eligibility/react_array.tsx")
        ? [["babel-plugin-react-compiler", { target: "19" }]] : [] }),
    }), captureReact],
  build: { outDir: path.join(stage, "dist"), emptyOutDir: false, minify: false,
    sourcemap: true, rollupOptions: { input: path.join(stage, "index.html") } },
});
