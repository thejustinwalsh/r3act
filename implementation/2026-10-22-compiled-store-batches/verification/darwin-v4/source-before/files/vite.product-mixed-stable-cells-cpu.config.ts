import { mergeConfig } from "vite";
import base from "./vite.product-mixed-stable-cells.config.ts";

const isolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
} as const;

export default mergeConfig(base, {
  preview: {
    headers: isolationHeaders,
  },
});
