import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { nativeModulePlugin } from "../../../compiler/vite_native_plugin.ts";

const stage = fileURLToPath(new URL("./", import.meta.url));
const root = fileURLToPath(new URL("../../../", import.meta.url));
const testCase = process.env.STRUCTURAL_ELIGIBILITY_CASE;
if (testCase !== "positive" && testCase !== "negative") {
  throw new Error("STRUCTURAL_ELIGIBILITY_CASE must be positive or negative");
}
const binary = path.join(stage, "cargo-target/debug/ui-graph-compiler-spike");
const captured = new Map<string, string>();

const captureNative: Plugin = {
  name: "structural-eligibility-capture-native",
  enforce: "pre",
  transform(code, id) {
    const name = path.basename(id.split("?", 1)[0]);
    if (["native_collection.tsx", "native_generic.tsx", "unsupported_index.tsx"].includes(name)) {
      captured.set(name, code);
    }
    return null;
  },
};

const captureReact: Plugin = {
  name: "structural-eligibility-capture-react",
  enforce: "post",
  transform(code, id) {
    if (path.basename(id.split("?", 1)[0]) === "react_array.tsx") {
      captured.set("react_array.tsx", code);
    }
    return null;
  },
  async closeBundle() {
    if (testCase !== "positive") return;
    const proofDir = path.join(stage, "proof");
    await mkdir(proofDir, { recursive: true });
    for (const [name, code] of captured) {
      await writeFile(path.join(proofDir, `${name}.emitted.txt`), code);
    }
  },
};

export default defineConfig({
  root,
  plugins: [
    nativeModulePlugin({ root, compilerRoot: root, compilerBinary: binary }),
    captureNative,
    react({
      exclude: /\/eligibility\/(?:native_collection|native_generic|unsupported_index)\.tsx(?:\?.*)?$/,
      babel: (id) => ({
        plugins: id.endsWith("/eligibility/react_array.tsx")
          ? [["babel-plugin-react-compiler", { target: "19" }]]
          : [],
      }),
    }),
    captureReact,
  ],
  build: {
    outDir: path.join(stage, `dist-${testCase}`),
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: path.join(stage, `${testCase}.html`),
    },
  },
});
