import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { nativeModulePlugin } from "../../compiler/vite_native_plugin.ts";

const html = fileURLToPath(new URL("./high-frequency.html", import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [
    nativeModulePlugin(),
    react({
      include: /react_high_frequency_arm\.tsx$/,
      babel: {
        plugins: [["babel-plugin-react-compiler", { target: "19" }]],
      },
    }),
  ],
  build: {
    rollupOptions: { input: { highFrequency: html } },
  },
});
