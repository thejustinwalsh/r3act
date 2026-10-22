import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { nativeModulePlugin } from "../../../compiler/vite_native_plugin.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const stage = fileURLToPath(new URL("./", import.meta.url));
const proofDirectory = process.env.ASYNC_RECOVERY_PROOF_DIR;
if (!proofDirectory) throw new Error("ASYNC_RECOVERY_PROOF_DIR must name a new proof directory");
const captured = new Map<string, string>();
const capture: Plugin = {
  name: "async-recovery-transform-capture", enforce: "post",
  transform(code, id) {
    const filename = path.basename(id.split("?", 1)[0]);
    if (filename === "native_arm.tsx" || filename === "react_arm.tsx") captured.set(filename, code);
    return null;
  },
  async closeBundle() {
    const output = path.join(proofDirectory!, "transforms");
    await mkdir(output, { recursive: true });
    for (const [filename, code] of captured) await writeFile(path.join(output, `${filename}.js`), code, { flag: "wx" });
  },
};
export default defineConfig({
  root,
  resolve: { alias: [
    { find: /^@r3act\/core\/jsx-runtime$/, replacement: path.join(root, "src/native_jsx_runtime.ts") },
    { find: /^@r3act\/core\/jsx-dev-runtime$/, replacement: path.join(root, "src/native_jsx_dev_runtime.ts") },
    { find: /^@r3act\/core$/, replacement: path.join(root, "src/native_runtime_api.ts") },
  ] },
  plugins: [nativeModulePlugin({ compilerBinary: path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike") }),
    react({ include: /react_arm\.tsx$/, babel: { plugins: [["babel-plugin-react-compiler", { target: "19" }]] } }), capture],
  build: { outDir: path.join(proofDirectory, "dist"), emptyOutDir: false, sourcemap: true,
    rollupOptions: { input: path.join(stage, "index.html") } },
});
