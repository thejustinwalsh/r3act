import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { nativeModulePlugin } from "../../../compiler/vite_native_plugin.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const stage = fileURLToPath(new URL("./", import.meta.url));
const proof = process.env.AUTHORED_LIFECYCLE_PROOF_DIR;
if (!proof) throw new Error("AUTHORED_LIFECYCLE_PROOF_DIR must name a new proof directory");
const transformed = new Map<string, string>();
const capture: Plugin = {
  name: "authored-lifecycle-transform-capture", enforce: "post",
  transform(code, id) {
    const name = path.basename(id.split("?", 1)[0]);
    if (name === "native_arm.tsx" || name === "react_arm.tsx") transformed.set(name, code);
    return null;
  },
  async closeBundle() {
    const destination = path.join(proof, "transforms");
    await mkdir(destination, { recursive: true });
    for (const [name, code] of transformed) await writeFile(path.join(destination, `${name}.js`), code, { flag: "wx" });
  },
};
export default defineConfig({
  root,
  resolve: { alias: [
    { find: /^@r3act\/core\/jsx-runtime$/, replacement: path.join(root, "src/native_jsx_runtime.ts") },
    { find: /^@r3act\/core\/jsx-dev-runtime$/, replacement: path.join(root, "src/native_jsx_runtime.ts") },
    { find: /^@r3act\/core$/, replacement: path.join(root, "src/native_runtime_api.ts") },
  ] },
  plugins: [
    nativeModulePlugin({ compilerBinary: path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike") }),
    react({ include: /react_arm\.tsx$/, babel: { plugins: [["babel-plugin-react-compiler", { target: "19" }]] } }),
    capture,
  ],
  build: { outDir: path.join(proof, "dist"), emptyOutDir: false, sourcemap: true,
    rollupOptions: { input: path.join(stage, "index.html") } },
});
