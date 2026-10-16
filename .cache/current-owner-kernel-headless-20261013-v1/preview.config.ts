import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL("../high-frequency-harness-stage/", import.meta.url)),
  build: { outDir: fileURLToPath(new URL("../high-frequency-build-proof-20261013-04/dist/", import.meta.url)) },
  preview: {
    allowedHosts: [".localhost"],
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cache-Control": "no-store",
    },
  },
});
