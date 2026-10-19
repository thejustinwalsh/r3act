import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { nativeModulePlugin } from "./compiler/vite_native_plugin.ts";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const compilerProof: Plugin = {
  name: "product-mixed-compiler-proof",
  enforce: "post",
  async transform(code, id) {
    const reactArm = id.endsWith("/src/browser/product_mixed_react_arm.tsx");
    const nativeArm = id.endsWith("/src/browser/native_product_mixed_arm.tsx");
    if (!reactArm && !nativeArm) return null;
    const row = code.slice(code.indexOf(reactArm ? "function ReactRow(" : "function ProductMixedRow("), code.indexOf(reactArm ? "function ReactBoard(" : "function ProductMixedBoard("));
    const board = code.slice(code.indexOf(reactArm ? "function ReactBoard(" : "function ProductMixedBoard("), code.indexOf(reactArm ? "const createProductMixedReact" : "const applyEdit"));
    const proof = reactArm
      ? { arm: "react", compiled: /react\/compiler-runtime|react-compiler-runtime/.test(code), rowMemoCache: /\b_c\(/.test(row), boardMemoCache: /\b_c\(/.test(board) }
      : { arm: "native", compiled: /__nativeDefineComponent\([^\n]*ProductMixedRow/.test(code), bindings: (row.match(/__nativeBindStateProps?At\(/g) ?? []).length, deltas: /__nativeRenderCollectionAt\(/.test(board), propOnly: /ProductMixedRow, \{ propOnlySites: \[[^\]]+#state:/.test(code), deltaFallback: /requiresOwnerRender:\s*true/.test(board) };
    await mkdir(".cache/product-mixed-prepared-dirty-membership/compiler-proof", { recursive: true });
    await writeFile(`.cache/product-mixed-prepared-dirty-membership/compiler-proof/${proof.arm}.json`, JSON.stringify(proof, null, 2) + "\n");
    await writeFile(`.cache/product-mixed-prepared-dirty-membership/compiler-proof/${proof.arm}.js`, code);
    if (!proof.compiled || (reactArm && (!("rowMemoCache" in proof) || !proof.rowMemoCache || !proof.boardMemoCache)) || (nativeArm && (!("bindings" in proof) || proof.bindings < 3 || !proof.deltas || !proof.propOnly || proof.deltaFallback))) {
      throw new Error(`Required compiler path missing: ${JSON.stringify(proof)}`);
    }
    return null;
  },
};
export default defineConfig({
  server: { ...(process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : {}), ...(process.env.HOST ? { host: process.env.HOST } : {}) },
  preview: { ...(process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : {}), ...(process.env.HOST ? { host: process.env.HOST } : {}) },
  plugins: [
    nativeModulePlugin(),
    react({ exclude: /native_product_mixed_arm\.tsx$/, babel: id => ({ plugins: id.endsWith("/product_mixed_react_arm.tsx") ? [["babel-plugin-react-compiler", { target: "19" }]] : [] }) }),
    compilerProof,
  ],
  build: { outDir: "dist-product-mixed-prepared-dirty-membership", rollupOptions: { input: fileURLToPath(new URL("./product-mixed-v2.html", import.meta.url)) } },
});
