import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import type { LoggerEvent } from "babel-plugin-react-compiler";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { nativeModulePlugin } from "../../../compiler/vite_native_plugin.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const stage = fileURLToPath(new URL("./", import.meta.url));
const proofDirectory = process.env.FORKED_TRANSITIONS_PROOF_DIR;
if (!proofDirectory) throw new Error("FORKED_TRANSITIONS_PROOF_DIR must name a new proof directory");
const captured = new Map<string, string>();
const compilerEvents: Array<{ filename: string | null; kind: string; fnName: string | null }> = [];
const logger = { logEvent(filename: string | null, event: LoggerEvent) {
  compilerEvents.push({ filename: filename ? path.relative(root, filename) : null,
    kind: event.kind, fnName: "fnName" in event ? event.fnName ?? null : null });
} };
let saved = false;
const capture: Plugin = {
  name: "forked-transitions-transform-capture", enforce: "post",
  transform(code, id) {
    const filename = path.basename(id.split("?", 1)[0]);
    if (["app.tsx", "scene.tsx", "main.tsx", "react_arm.tsx"].includes(filename)) captured.set(filename, code);
    return null;
  },
  async closeBundle() {
    if (saved) return;
    saved = true;
    const output = path.join(proofDirectory!, "transforms");
    await mkdir(output, { recursive: true });
    for (const [filename, code] of captured) await writeFile(path.join(output, `${filename}.js`), code, { flag: "wx" });
    await writeFile(path.join(proofDirectory!, "react-compiler-events.json"),
      JSON.stringify(compilerEvents, null, 2) + "\n", { flag: "wx" });
  },
};
export default defineConfig({
  root,
  resolve: { alias: [
    { find: /^@r3act\/core\/jsx-runtime$/, replacement: path.join(root, "src/native_jsx_runtime.ts") },
    { find: /^@r3act\/core\/jsx-dev-runtime$/, replacement: path.join(root, "src/native_jsx_dev_runtime.ts") },
    { find: /^@r3act\/core$/, replacement: path.join(root, "src/native_runtime_api.ts") },
    { find: /^@r3act\/host-dom$/, replacement: path.join(root, "src/native_dom_api.ts") },
    { find: /^@r3act\/host-three\/jsx-runtime$/, replacement: path.join(root, "src/three_jsx_runtime.ts") },
    { find: /^@r3act\/host-three\/jsx-dev-runtime$/, replacement: path.join(root, "src/three_jsx_dev_runtime.ts") },
    { find: /^@r3act\/host-three$/, replacement: path.join(root, "src/three_host.ts") },
  ] },
  plugins: [nativeModulePlugin({ compilerBinary: path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike") }),
    react({ include: /react_arm\.tsx$/, babel: { plugins: [["babel-plugin-react-compiler", { target: "19", logger }]] } }), capture],
  build: { outDir: path.join(proofDirectory, "dist"), emptyOutDir: false, sourcemap: true,
    rolldownOptions: { input: path.join(stage, "index.html") } },
});
