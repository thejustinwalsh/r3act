import { mergeConfig } from "vite";
import base from "./vite.product-mixed-compiled-owner-rows.config.ts";

const isolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
} as const;

export default mergeConfig(base, {
  preview: {
    headers: isolationHeaders,
  },
});
