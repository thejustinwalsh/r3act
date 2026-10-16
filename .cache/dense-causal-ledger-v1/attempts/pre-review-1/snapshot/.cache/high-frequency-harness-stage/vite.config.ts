import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { nativeModulePlugin } from "../../compiler/vite_native_plugin.ts";
import { highFrequencyBuildProofPlugin } from "./build_proof_plugin.ts";

const html = fileURLToPath(new URL("./high-frequency.html", import.meta.url));
const stage = fileURLToPath(new URL(".", import.meta.url));
const proofDirectory = process.env.HIGH_FREQUENCY_PROOF_DIR;
if (!proofDirectory) throw new Error("HIGH_FREQUENCY_PROOF_DIR must name a unique proof directory");
const reactCompilerEvents: Array<{ filename: string | null; event: unknown }> = [];

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [
    nativeModulePlugin(),
    react({
      include: /react_high_frequency_arm\.tsx$/,
      babel: {
        plugins: [["babel-plugin-react-compiler", {
          target: "19",
          logger: {
            logEvent(filename: string | null, event: unknown) {
              reactCompilerEvents.push({ filename, event });
            },
          },
        }]],
      },
    }),
    highFrequencyBuildProofPlugin(stage, proofDirectory, reactCompilerEvents),
  ],
  build: {
    sourcemap: true,
    outDir: path.join(proofDirectory, "dist"),
    rollupOptions: { input: { highFrequency: html } },
  },
});
