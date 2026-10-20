// Separate production candidate; the V2 and identity-V3 artifacts stay frozen.
import { defineConfig, mergeConfig } from "vite";
import baseline from "./vite.product-mixed-v2.config.ts";

export default mergeConfig(baseline, defineConfig({
  build: { outDir: "dist-product-mixed-direct-writers" },
}));
