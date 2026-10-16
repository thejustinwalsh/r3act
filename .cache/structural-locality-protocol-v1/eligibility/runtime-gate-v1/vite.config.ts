import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { nativeModulePlugin } from "../../../../compiler/vite_native_plugin.ts";

const stage = fileURLToPath(new URL("./", import.meta.url));
const root = fileURLToPath(new URL("../../../../", import.meta.url));
const binary = path.join(stage, "../cargo-target/debug/ui-graph-compiler-spike");
const captured = new Map<string, string>();
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
  async closeBundle() {
    const proof = path.join(stage, "proof");
    await mkdir(proof, { recursive: true });
    for (const [name, code] of captured) await writeFile(path.join(proof, `${name}.emitted.txt`), code, { flag: "wx" });
  },
};
export default defineConfig({
  root,
  plugins: [nativeModulePlugin({ root, compilerRoot: root, compilerBinary: binary }),
    captureNative,
    react({
      exclude: /\/(?:eligibility\/(?:native_collection|native_generic)|runtime-gate-v1\/native_controller)\.tsx(?:\?.*)?$/,
      babel: (id) => ({ plugins: id.endsWith("/eligibility/react_array.tsx")
        ? [["babel-plugin-react-compiler", { target: "19" }]] : [] }),
    }), captureReact],
  build: { outDir: path.join(stage, "dist"), emptyOutDir: false, minify: false,
    sourcemap: true, rollupOptions: { input: path.join(stage, "index.html") } },
});
