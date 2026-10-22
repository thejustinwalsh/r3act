// Correctness-only candidate build. Keep the frozen V2 comparison artifact intact.
import { defineConfig, mergeConfig } from "vite";
import baseline from "./vite.product-mixed-v2.config.ts";

export default mergeConfig(baseline, defineConfig({
  build: { outDir: "dist-product-mixed-candidate" },
}));
