import { mergeConfig } from "vite";
import base from "./vite.product-mixed-v2.config.ts";

export default mergeConfig(base, {
  build: { outDir: "dist-product-mixed-cell-identity" },
});
