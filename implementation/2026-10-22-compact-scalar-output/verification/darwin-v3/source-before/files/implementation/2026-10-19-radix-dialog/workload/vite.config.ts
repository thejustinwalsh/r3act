import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import type { LoggerEvent } from "babel-plugin-react-compiler";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { nativeModulePlugin } from "../../../compiler/vite_native_plugin.ts";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const stage = fileURLToPath(new URL("./", import.meta.url));
const proofDirectory = process.env.RADIX_DIALOG_PROOF_DIR;
if (!proofDirectory) throw new Error("RADIX_DIALOG_PROOF_DIR must name a new proof directory");
const captured = new Map<string, string>();
const compilerEvents: Array<Record<string, unknown>> = [];
const logger = { logEvent(filename: string | null, event: LoggerEvent) {
  const detail = "detail" in event ? event.detail : null;
  const detailRecord = detail && typeof detail === "object" ? detail as Record<string, unknown> : null;
  const options = detailRecord?.options && typeof detailRecord.options === "object" ?
    detailRecord.options as Record<string, unknown> : null;
  compilerEvents.push({ filename: filename ? path.relative(root, filename) : null,
    kind: event.kind, fnName: "fnName" in event ? event.fnName : null,
    reason: "reason" in event ? event.reason : null,
    fnLoc: "fnLoc" in event ? event.fnLoc : null,
    detailReason: detailRecord?.reason ?? options?.reason ?? null,
    detailDescription: detailRecord?.description ?? options?.description ?? null,
    detail: detail == null ? null : String(detail) });
} };
let saved = false;
const capture: Plugin = {
  name: "radix-dialog-capture-transforms", enforce: "post",
  transform(code, id) {
    const filename = path.basename(id.split("?", 1)[0]);
    if (["native-radix-dialog.tsx", "native_arm.tsx", "dialog_body.tsx",
      "react_arm.tsx", "react_radix_dialog_adapter.tsx"].includes(filename)) captured.set(filename, code);
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
    { find: /^@r3act\/core\/react\/radix-dialog$/, replacement: path.join(root, "src/react_radix_dialog_adapter.tsx") },
    { find: /^@r3act\/core$/, replacement: path.join(root, "src/native_runtime_api.ts") },
    { find: /^@r3act\/react-bridge\/radix-dialog$/, replacement: path.join(root, "src/react_radix_dialog_adapter.tsx") },
    { find: /^@r3act\/react-bridge$/, replacement: path.join(root, "src/react_native_adapter.ts") },
  ] },
  plugins: [nativeModulePlugin({ compilerBinary: path.join(root, "compiler/oxc-spike/target/debug/ui-graph-compiler-spike") }),
    react({ include: /(react_arm|dialog_body|react_radix_dialog_adapter)\.tsx$/,
      babel: { plugins: [["babel-plugin-react-compiler", { target: "19", logger }]] } }), capture],
  build: { outDir: path.join(proofDirectory, "dist"), emptyOutDir: false, sourcemap: true,
    rollupOptions: { input: path.join(stage, "index.html") } },
});
