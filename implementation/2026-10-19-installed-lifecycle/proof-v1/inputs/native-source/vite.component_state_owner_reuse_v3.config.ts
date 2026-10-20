import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import {
  defineConfig,
  type Plugin,
  type PreviewServer,
  type ViteDevServer,
} from "vite";

const installArchive = (server: ViteDevServer | PreviewServer) => {
  server.middlewares.use(
    "/__benchmark/save-component-state-owner-reuse-v3",
    (request, response) => {
      if (request.method !== "POST") {
        response.statusCode = 405;
        response.end("Method not allowed");
        return;
      }
      let body = "";
      request.on("data", (chunk: unknown) => {
        body += String(chunk);
        if (body.length > 4_000_000) {
          response.statusCode = 413;
          response.end("V3 owner-reuse record too large");
          request.destroy();
        }
      });
      request.on("end", async () => {
        try {
          const record = JSON.parse(body);
          const valid = record.schemaVersion ===
              "component-state-owner-reuse-v3-browser-v1" &&
            record.status === "PASS" && record.count === 10_000 &&
            [1, 2, 3, 4, 5].includes(record.replication) &&
            record.seed === 83_005_300 + record.replication &&
            record.warmupPairs === 8 && record.measuredPairs === 24 &&
            record.browser?.visibilityState === "visible" &&
            record.browser?.buildMode === "production" &&
            record.reactCompiler?.package === "babel-plugin-react-compiler" &&
            record.integrity?.allEdgeParity === true &&
            record.integrity?.allRotationParity === true &&
            record.integrity?.allHostIdentity === true &&
            record.integrity?.allChildStateRetained === true &&
            Array.isArray(record.samples) && record.samples.length === 24 &&
            record.samples.every((sample: any) =>
              sample.parity?.edge === true && sample.parity?.rotate === true &&
              Object.values(sample.milliseconds ?? {}).every((stages: any) =>
                Number.isFinite(stages.edge) && stages.edge >= 0 &&
                Number.isFinite(stages.rotate) && stages.rotate >= 0
              )
            );
          if (!valid) {
            response.statusCode = 400;
            response.end("V3 owner-reuse browser contract validation failed");
            return;
          }
          const directory = fileURLToPath(
            new URL(
              "./results/component-state-owner-reuse-v3/browser-production",
              import.meta.url,
            ),
          );
          await mkdir(directory, { recursive: true });
          const filename =
            `component-state-owner-reuse-v3-browser-${record.seed}.json`;
          await writeFile(
            path.join(directory, filename),
            `${JSON.stringify(record, null, 2)}\n`,
          );
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ status: "SAVED", filename }));
        } catch (error) {
          response.statusCode = 400;
          response.end(
            error instanceof Error ? error.message : "Invalid record",
          );
        }
      });
    },
  );
};

const archivePlugin: Plugin = {
  name: "component-state-owner-reuse-v3-archive",
  configureServer: installArchive,
  configurePreviewServer: installArchive,
};

let compilerEvidenceJson: string | null = null;
const compilerEvidencePlugin: Plugin = {
  name: "component-state-owner-reuse-v3-react-compiler-evidence",
  enforce: "post",
  buildStart() {
    compilerEvidenceJson = null;
  },
  transform(code, id) {
    if (
      !id.split("?")[0].replaceAll("\\", "/").endsWith(
        "src/browser/component_state_owner_reuse_v3_browser_benchmark.tsx",
      )
    ) return null;
    const cacheSites = [...code.matchAll(/\b_c\(\d+\)/g)].length;
    const evidence = {
      schemaVersion: "react-compiler-vite-transform-evidence-v1",
      sourceModule:
        "src/browser/component_state_owner_reuse_v3_browser_benchmark.tsx",
      package: "babel-plugin-react-compiler",
      target: "19",
      compilerRuntimeImport: code.includes("react/compiler-runtime"),
      compiledComponents: ["ReactApp", "ReactRow"].filter((name) =>
        code.includes(name)
      ),
      memoCacheSites: cacheSites,
      transformedModuleBytes: new TextEncoder().encode(code).length,
    };
    if (
      !evidence.compilerRuntimeImport ||
      evidence.compiledComponents.length !== 2 || cacheSites < 2
    ) {
      throw new Error(
        `React Compiler lowering check failed: ${JSON.stringify(evidence)}`,
      );
    }
    compilerEvidenceJson = `${JSON.stringify(evidence, null, 2)}\n`;
    return null;
  },
  generateBundle() {
    if (!compilerEvidenceJson) {
      throw new Error("React Compiler evidence transform did not run");
    }
    this.emitFile({
      type: "asset",
      fileName: "react-compiler-build-evidence.json",
      source: compilerEvidenceJson,
    });
  },
};

const htmlPath = fileURLToPath(
  new URL(
    "./component-state-owner-reuse-v3-browser-benchmark.html",
    import.meta.url,
  ),
);

export default defineConfig({
  server: {
    ...(process.env.PORT
      ? { port: Number(process.env.PORT), strictPort: true }
      : {}),
    ...(process.env.HOST ? { host: process.env.HOST } : {}),
  },
  preview: {
    ...(process.env.PORT
      ? { port: Number(process.env.PORT), strictPort: true }
      : {}),
    ...(process.env.HOST ? { host: process.env.HOST } : {}),
  },
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", { target: "19" }]],
      },
    }),
    compilerEvidencePlugin,
    archivePlugin,
  ],
  build: {
    outDir: "dist-component-state-owner-reuse-v3",
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: { componentStateOwnerReuseV3: htmlPath },
    },
  },
});
