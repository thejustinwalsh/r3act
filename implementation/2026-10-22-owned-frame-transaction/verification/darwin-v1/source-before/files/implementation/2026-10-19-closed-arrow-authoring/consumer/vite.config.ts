import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nativeReactPlugins } from "@r3act/vite";

export default defineConfig({
  plugins: nativeReactPlugins(react, {
    root: fileURLToPath(new URL(".", import.meta.url)),
    sourceRoots: ["."],
    reactOptions: { jsxImportSource: "react" },
  }),
  base: "./",
});
