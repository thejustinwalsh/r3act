import { mergeConfig } from "vite";
import base from "./vite.product-mixed-v2.config.ts";

// A separate output preserves every previously measured production candidate.
export default mergeConfig(base, {
  build: { outDir: "dist-product-mixed-unary" },
});
