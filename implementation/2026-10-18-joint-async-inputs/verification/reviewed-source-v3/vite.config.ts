import react from "@vitejs/plugin-react";
import { vitexec } from "vitexec";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  defineConfig,
  type Plugin,
  type PreviewServer,
  transformWithOxc,
  type ViteDevServer,
} from "vite";
import { fileURLToPath } from "node:url";
import { nativeModulePlugin } from "./compiler/vite_native_plugin.ts";

const installBenchmarkArchive = (server: ViteDevServer | PreviewServer) => {
  server.middlewares.use((request, response, next) => {
    if (!request.url?.startsWith("/__benchmark/async-dag-resource")) {
      next();
      return;
    }
    if (request.method !== "GET") {
      response.statusCode = 405;
      response.end("Method not allowed");
      return;
    }
    const url = new URL(request.url, "http://localhost");
    const resource = url.searchParams.get("resource");
    const delay = Number(url.searchParams.get("delay"));
    const id = url.searchParams.get("id") ?? "";
    const payloads: Record<string, unknown> = {
      profile: { name: "Ada" },
      feed: { label: "Latest item" },
      recommendations: { label: "Recommended for Ada" },
    };
    if (!(resource && resource in payloads) || !Number.isFinite(delay) || delay < 1 || delay > 500 || !id) {
      response.statusCode = 400;
      response.end("Invalid async DAG resource request");
      return;
    }
    response.setHeader("Content-Type", "application/json");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Benchmark-Request-Id", id);
    setTimeout(() => response.end(JSON.stringify(payloads[resource])), delay);
  });
  server.middlewares.use(
    "/__benchmark/save-async-dag-frontier",
    (request, response) => {
      if (request.method !== "POST") {
        response.statusCode = 405;
        response.end("Method not allowed");
        return;
      }
      let body = "";
      request.on("data", (chunk: unknown) => {
        body += String(chunk);
        if (body.length > 512_000) {
          response.statusCode = 413;
          response.end("Benchmark record too large");
          request.destroy();
        }
      });
      request.on("end", async () => {
        try {
          const record = JSON.parse(body);
          const arms = record.arms ?? {};
          const envelopeValid = record.schemaVersion === "async-dag-frontier-browser-v2" &&
            record.collection === "async-dag-frontier-v2" &&
            ["PASS", "FAIL"].includes(record.status) && record.replication >= 0 && record.replication < 30 &&
            record.browser?.buildMode === "production" && record.browser?.visibilityState === "visible" &&
            record.armOrder?.length === 3 && new Set(record.armOrder).size === 3 &&
            ["serial", "reactPreload", "dag"].every((arm) => record.armOrder.includes(arm));
          const completeValid = record.complete === true &&
            ["serial", "reactPreload", "dag"].every((arm) => arms[arm]?.arm === arm && Array.isArray(arms[arm]?.events));
          const interruptedValid = record.complete === false && record.status === "FAIL" && typeof record.failure === "string";
          const valid = envelopeValid && (completeValid || interruptedValid);
          if (!valid) {
            response.statusCode = 400;
            response.end("Async DAG frontier benchmark contract validation failed");
            return;
          }
          const directory = fileURLToPath(new URL("./results/async-dag-frontier-v2", import.meta.url));
          await mkdir(directory, { recursive: true });
          const filename = `async-dag-frontier-v2-r${record.replication}-${Date.now()}.json`;
          await writeFile(path.join(directory, filename), `${JSON.stringify(record, null, 2)}\n`);
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ status: "SAVED", filename }));
        } catch (error) {
          response.statusCode = 400;
          response.end(error instanceof Error ? error.message : "Invalid async DAG record");
        }
      });
    },
  );
  server.middlewares.use(
    "/__benchmark/save-snake-phase-v1",
    (request, response) => {
      if (request.method !== "POST") {
        response.statusCode = 405;
        response.end("Method not allowed");
        return;
      }
      let body = "";
      request.on("data", (chunk: unknown) => {
        body += String(chunk);
        if (body.length > 2_000_000) {
          response.statusCode = 413;
          response.end("Phase record too large");
          request.destroy();
        }
      });
      request.on("end", async () => {
        try {
          const record = JSON.parse(body);
          const isSmoke = record.collection === "smoke";
          const valid =
            record.schemaVersion === "snake-frame-phase-browser-v1" &&
            record.status === "PASS" && record.allContractsPass === true &&
            (isSmoke || record.collection === "scheduled") &&
            record.browser?.buildMode === "production" &&
            record.browser?.visibilityState === "visible" &&
            record.longAnimationFrameSupport?.supported === true &&
            ["react", "runtime-vdom", "columnar-vdom"].includes(record.arm) &&
            [1024, 8192].includes(record.segmentCount) &&
            record.calibrationFrames === 120 && record.warmupFrames === 60 &&
            record.measuredFrames === 240 &&
            record.baselineRafMs?.samples?.length === 120 &&
            record.measuredRafMs?.samples?.length === 240 &&
            record.updateCpuMs?.samples?.length === 240 &&
            Array.isArray(record.longAnimationFrames?.entries) &&
            record.longAnimationFrames.count ===
              record.longAnimationFrames.entries.length &&
            record.outputMatches && record.stableNodeIdentity &&
            record.emptyContainerAfterTeardown &&
            (record.arm === "react"
              ? record.remainingSubscriptions === 0
              : Object.values(record.runtimeDiagnosticsAfterTeardown ?? {})
                .every((value) => value === 0));
          if (!valid) {
            response.statusCode = 400;
            response.end("Phase record contract validation failed");
            return;
          }
          const resultsDirectory = fileURLToPath(
            new URL(
              isSmoke
                ? "./results/snake-frame-phase-v1-smoke"
                : "./results/snake-frame-phase-v1",
              import.meta.url,
            ),
          );
          await mkdir(resultsDirectory, { recursive: true });
          const filename =
            `phase-v1-s${record.segmentCount}-r${record.replication}-${record.arm}-${Date.now()}.json`;
          await writeFile(
            path.join(resultsDirectory, filename),
            `${JSON.stringify(record, null, 2)}\n`,
          );
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ status: "SAVED", filename }));
        } catch (error) {
          response.statusCode = 400;
          response.end(
            error instanceof Error ? error.message : "Invalid phase record",
          );
        }
      });
    },
  );
  server.middlewares.use(
    "/__benchmark/save-snake-cadence-v1",
    (request, response) => {
      if (request.method !== "POST") {
        response.statusCode = 405;
        response.end("Method not allowed");
        return;
      }
      let body = "";
      request.on("data", (chunk: unknown) => {
        body += String(chunk);
        if (body.length > 2_000_000) {
          response.statusCode = 413;
          response.end("Cadence record too large");
          request.destroy();
        }
      });
      request.on("end", async () => {
        try {
          const record = JSON.parse(body);
          const isSmoke = record.collection === "smoke";
          const valid =
            record.schemaVersion === "snake-frame-cadence-browser-v1" &&
            record.status === "PASS" && record.allContractsPass === true &&
            (isSmoke || record.collection === "scheduled") &&
            record.browser?.buildMode === "production" &&
            record.browser?.visibilityState === "visible" &&
            ["react", "runtime-vdom", "columnar-vdom"].includes(record.arm) &&
            [1024, 4096, 8192].includes(record.segmentCount) &&
            record.calibrationFrames === 120 && record.warmupFrames === 60 &&
            record.measuredFrames === 240 &&
            record.baselineRafMs?.samples?.length === 120 &&
            record.measuredRafMs?.samples?.length === 240 &&
            record.updateCpuMs?.samples?.length === 240 &&
            Number.isFinite(record.baselineRafMs?.median) &&
            Number.isFinite(record.measuredRafMs?.lateCallbackRate) &&
            Number.isSafeInteger(record.measuredRafMs?.estimatedMissedSlots) &&
            record.outputMatches && record.stableNodeIdentity &&
            record.emptyContainerAfterTeardown &&
            (record.arm === "react"
              ? record.remainingSubscriptions === 0
              : Object.values(record.runtimeDiagnosticsAfterTeardown ?? {})
                .every((value) => value === 0));
          if (!valid) {
            response.statusCode = 400;
            response.end("Cadence record contract validation failed");
            return;
          }
          const resultsDirectory = fileURLToPath(
            new URL(
              isSmoke
                ? "./results/snake-frame-cadence-v1-smoke"
                : "./results/snake-frame-cadence-v1",
              import.meta.url,
            ),
          );
          await mkdir(resultsDirectory, { recursive: true });
          const filename =
            `cadence-v1-s${record.segmentCount}-r${record.replication}-${record.arm}-${Date.now()}.json`;
          await writeFile(
            path.join(resultsDirectory, filename),
            `${JSON.stringify(record, null, 2)}\n`,
          );
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ status: "SAVED", filename }));
        } catch (error) {
          response.statusCode = 400;
          response.end(
            error instanceof Error ? error.message : "Invalid cadence record",
          );
        }
      });
    },
  );
  server.middlewares.use(
    "/__benchmark/save-snake-lifecycle-v1",
    (request, response) => {
      if (request.method !== "POST") {
        response.statusCode = 405;
        response.end("Method not allowed");
        return;
      }
      let body = "";
      request.on("data", (chunk: unknown) => {
        body += String(chunk);
        if (body.length > 2_000_000) {
          response.statusCode = 413;
          response.end("Lifecycle record too large");
          request.destroy();
        }
      });
      request.on("end", async () => {
        try {
          const record = JSON.parse(body);
          const isSmoke = record.collection === "smoke";
          const valid = isSmoke
            ? record.schemaVersion === "snake-frame-lifecycle-browser-v1"
            : record.schemaVersion === "snake-frame-lifecycle-browser-v1" &&
              record.status === "PASS" && record.allContractsPass === true &&
              record.browser?.buildMode === "production" &&
              record.browser?.visibilityState === "visible" &&
              ["react", "runtime-vdom", "columnar-vdom"].includes(record.arm) &&
              [512, 1024].includes(record.segmentCount) &&
              record.warmupFrames === 90 && record.measuredFrames === 300 &&
              Number.isFinite(record.mountMs) &&
              Number.isFinite(record.teardownMs) &&
              Number.isFinite(record.primaryCycleCostMs) &&
              record.outputMatches &&
              record.stableNodeIdentity && record.emptyContainerAfterTeardown &&
              (record.arm === "react"
                ? record.remainingSubscriptions === 0
                : Object.values(record.runtimeDiagnosticsAfterTeardown ?? {})
                  .every((value) => value === 0)) &&
              record.updateCpuMs?.samples?.length === 300;
          if (!valid) {
            response.statusCode = 400;
            response.end("Lifecycle record contract validation failed");
            return;
          }
          const collectionDirectory = record.collection === "smoke"
            ? "results/snake-frame-lifecycle-v1-smoke"
            : "results/snake-frame-lifecycle-v1";
          const resultsDirectory = fileURLToPath(
            new URL(`./${collectionDirectory}`, import.meta.url),
          );
          await mkdir(resultsDirectory, { recursive: true });
          const filename =
            `lifecycle-v1-s${record.segmentCount}-r${record.replication}-${record.arm}-${Date.now()}.json`;
          await writeFile(
            path.join(resultsDirectory, filename),
            `${JSON.stringify(record, null, 2)}\n`,
          );
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ status: "SAVED", filename }));
        } catch (error) {
          response.statusCode = 400;
          response.end(
            error instanceof Error ? error.message : "Invalid lifecycle record",
          );
        }
      });
    },
  );
  server.middlewares.use(
    "/__benchmark/save-snake-sparse-frame-v1",
    (request, response) => {
      if (request.method !== "POST") {
        response.statusCode = 405;
        response.end("Method not allowed");
        return;
      }
      let body = "";
      request.on("data", (chunk: unknown) => {
        body += String(chunk);
        if (body.length > 2_000_000) {
          response.statusCode = 413;
          response.end("Sparse Snake record too large");
          request.destroy();
        }
      });
      request.on("end", async () => {
        try {
          const record = JSON.parse(body);
          const valid =
            record.schemaVersion === "snake-sparse-frame-browser-v1" &&
            record.status === "PASS" && record.allContractsPass === true &&
            record.browser?.buildMode === "production" &&
            record.browser?.visibilityState === "visible" &&
            [
              "react",
              "dense-vdom",
              "dirty-rows-vdom",
              "bucket-32-vdom",
              "bucket-128-vdom",
              "direct",
            ].includes(record.arm) &&
            [512, 4096].includes(record.size) &&
            [1, 10, 50, 100].includes(record.dirtyPercent) &&
            ["clustered", "scattered"].includes(record.locality) &&
            Number.isInteger(record.replication) && record.replication >= 1 &&
            record.replication <= 3 &&
            record.warmupFrames === 30 && record.measuredFrames === 60 &&
            Number.isFinite(record.mountMs) && record.mountMs >= 0 &&
            record.stableNodeCount && record.stableNodeIdentity &&
            record.finalOutputParity && record.completeCommitCoverage &&
            Array.isArray(record.samples) && record.samples.length === 60 &&
            record.samples.every((sample: any) =>
              Number.isSafeInteger(sample.frame) &&
              Number.isFinite(sample.intervalMs) && sample.intervalMs >= 0 &&
              Number.isFinite(sample.updateCpuMs) && sample.updateCpuMs >= 0 &&
              Number.isFinite(sample.commitMs) && sample.commitMs >= 0
            );
          if (
            !valid || !/^sparse-v1-/.test(record.trialId) ||
            !/^[0-9a-f-]{36}$/i.test(record.pageLoadId ?? "")
          ) {
            response.statusCode = 400;
            response.end("Sparse Snake frame contract validation failed");
            return;
          }
          const resultsDirectory = fileURLToPath(
            new URL(
              "./results/snake-sparse-frame-v1-production",
              import.meta.url,
            ),
          );
          await mkdir(resultsDirectory, { recursive: true });
          const filename =
            `snake-sparse-v1-${record.size}-${record.dirtyPercent}-${record.locality}-r${record.replication}-${record.arm}-${record.pageLoadId}.json`;
          await writeFile(
            path.join(resultsDirectory, filename),
            `${JSON.stringify(record, null, 2)}\n`,
          );
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ status: "SAVED", filename }));
        } catch (error) {
          response.statusCode = 400;
          response.end(
            error instanceof Error
              ? error.message
              : "Invalid sparse Snake record",
          );
        }
      });
    },
  );
  server.middlewares.use(
    "/__benchmark/save-keyed-region-frame-pacing",
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
          response.end("Frame pacing record too large");
          request.destroy();
        }
      });
      request.on("end", async () => {
        try {
          const record = JSON.parse(body);
          if (
            ![
              "keyed-region-frame-pacing-v1",
              "keyed-region-frame-pacing-isolated-v1",
              "keyed-region-frame-pacing-attribution-v1",
            ].includes(record.schemaVersion) ||
            record.status !== "PASS" ||
            ![1_000, 5_000, 10_000].includes(record.entityCount) ||
            record.timedPairs !== 24 || record.samples?.length !== 24 ||
            !record.allOutputsEqual ||
            !record.samples.every((sample: any) => sample.sameOutput)
          ) {
            response.statusCode = 400;
            response.end("Frame pacing record contract validation failed");
            return;
          }
          const protocol = record.schemaVersion ===
              "keyed-region-frame-pacing-attribution-v1"
            ? "attribution-v1"
            : record.schemaVersion ===
                "keyed-region-frame-pacing-isolated-v1"
            ? "isolated-v1"
            : "v1";
          const filename =
            `keyed-region-frame-pacing-${protocol}-${Date.now()}.json`;
          const resultsDirectory = fileURLToPath(
            new URL("./results", import.meta.url),
          );
          await mkdir(resultsDirectory, { recursive: true });
          await writeFile(
            path.join(resultsDirectory, filename),
            `${JSON.stringify(record, null, 2)}\n`,
          );
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ status: "SAVED", filename }));
        } catch (error) {
          response.statusCode = 400;
          response.end(
            error instanceof Error
              ? error.message
              : "Invalid frame pacing record",
          );
        }
      });
    },
  );
  server.middlewares.use(
    "/__benchmark/save-async-suspense",
    (request, response) => {
      if (request.method !== "POST") {
        response.statusCode = 405;
        response.end("Method not allowed");
        return;
      }
      let body = "";
      request.on("data", (chunk: unknown) => {
        body += String(chunk);
        if (body.length > 256_000) {
          response.statusCode = 413;
          response.end("Benchmark record too large");
          request.destroy();
        }
      });
      request.on("end", async () => {
        try {
          const record = JSON.parse(body);
          if (
            record.schemaVersion !== "async-suspense-browser-v1" ||
            record.status !== "PASS" || !Array.isArray(record.samples) ||
            record.samples.length !== 20 || !record.allPendingUiRetained ||
            !record.allKeysRetained || !record.allOutputsEqual ||
            JSON.stringify(record.compilerOrder) !==
              JSON.stringify(["profile", "feed", "header", "page-model"])
          ) {
            response.statusCode = 400;
            response.end("Async Suspense benchmark contract validation failed");
            return;
          }
          const filename = `async-suspense-browser-v1-${Date.now()}.json`;
          const resultsDirectory = fileURLToPath(
            new URL("./results", import.meta.url),
          );
          await mkdir(resultsDirectory, { recursive: true });
          await writeFile(
            path.join(resultsDirectory, filename),
            `${JSON.stringify(record, null, 2)}\n`,
          );
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ status: "SAVED", filename }));
        } catch (error) {
          response.statusCode = 400;
          response.end(
            error instanceof Error ? error.message : "Invalid benchmark record",
          );
        }
      });
    },
  );
  server.middlewares.use(
    "/__benchmark/save-async-task-reuse-browser",
    (request, response) => {
      if (request.method !== "POST") {
        response.statusCode = 405;
        response.end("Method not allowed");
        return;
      }
      let body = "";
      request.on("data", (chunk: unknown) => {
        body += String(chunk);
        if (body.length > 1_000_000) {
          response.statusCode = 413;
          response.end("Benchmark record too large");
          request.destroy();
        }
      });
      request.on("end", async () => {
        try {
          const record = JSON.parse(body);
          const validSamples = Array.isArray(record.samples) &&
            record.samples.length === 40 &&
            record.samples.every((sample: any) =>
              sample.outputParity &&
              Object.values(sample.pendingUiRetained ?? {}).every(Boolean) &&
              Object.values(sample.keyedIdentityRetained ?? {}).every(
                Boolean,
              ) &&
              Object.values(sample.staleResultIgnored ?? {}).every(Boolean) &&
              Object.values(sample.invalidationRestart ?? {}).every(Boolean) &&
              sample.catalogRuns?.react === 1 &&
              sample.catalogRuns?.fullRestart === 2 &&
              sample.catalogRuns?.reuseCompleted === 1 &&
              sample.restartCount?.fullRestart === 1 &&
              sample.restartCount?.reuseCompleted === 1 &&
              sample.reusedCatalog?.reuseCompleted === true &&
              sample.reusedCatalog?.fullRestart === false
            );
          if (
            record.schemaVersion !== "async-task-reuse-browser-v1" ||
            record.status !== "PASS" ||
            record.measuredPairsPerWorkload !== 20 ||
            JSON.stringify(record.workIterations) !==
              JSON.stringify([0, 250_000]) ||
            !record.allContractsPass || !validSamples
          ) {
            response.statusCode = 400;
            response.end("Async task reuse browser contracts failed");
            return;
          }
          const filename = `async-task-reuse-browser-v1-${Date.now()}.json`;
          const resultsDirectory = fileURLToPath(
            new URL("./results", import.meta.url),
          );
          await mkdir(resultsDirectory, { recursive: true });
          await writeFile(
            path.join(resultsDirectory, filename),
            `${JSON.stringify(record, null, 2)}\n`,
          );
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ status: "SAVED", filename }));
        } catch (error) {
          response.statusCode = 400;
          response.end(
            error instanceof Error ? error.message : "Invalid benchmark record",
          );
        }
      });
    },
  );
  server.middlewares.use("/__benchmark/save", (request, response) => {
    if (request.method !== "POST") {
      response.statusCode = 405;
      response.end("Method not allowed");
      return;
    }
    let body = "";
    request.on("data", (chunk: unknown) => {
      body += String(chunk);
      if (body.length > 256_000) {
        response.statusCode = 413;
        response.end("Benchmark record too large");
        request.destroy();
      }
    });
    request.on("end", async () => {
      try {
        const record = JSON.parse(body);
        const validCount = [100, 1_000, 5_000, 10_000].includes(record.count);
        if (
          record.schemaVersion !== "component-state-react-browser-v1" ||
          record.status !== "PASS" ||
          !validCount || !Number.isSafeInteger(record.seed) ||
          record.seed < 0 ||
          record.measuredPairs !== 40 || record.updatesPerSample !== 100 ||
          !record.partialCommitContract || !record.stableTargetIdentity ||
          !record.finalOutputParity ||
          record.rendersPerUpdate?.react !== 1 ||
          record.rendersPerUpdate?.runtime !== 1 ||
          !Array.isArray(record.samples) || record.samples.length !== 40
        ) {
          response.statusCode = 400;
          response.end("Benchmark contract validation failed");
          return;
        }
        const filename =
          `browser-component-state-react-v1-${record.count}-${record.seed}.json`;
        const resultsDirectory = fileURLToPath(
          new URL("./results", import.meta.url),
        );
        await mkdir(resultsDirectory, { recursive: true });
        await writeFile(
          path.join(resultsDirectory, filename),
          `${JSON.stringify(record, null, 2)}\n`,
        );
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ status: "SAVED", filename }));
      } catch (error) {
        response.statusCode = 400;
        response.end(
          error instanceof Error ? error.message : "Invalid benchmark record",
        );
      }
    });
  });
  server.middlewares.use(
    "/__benchmark/save-tree-shape",
    (request, response) => {
      if (request.method !== "POST") {
        response.statusCode = 405;
        response.end("Method not allowed");
        return;
      }
      let body = "";
      request.on("data", (chunk: unknown) => {
        body += String(chunk);
        if (body.length > 256_000) {
          response.statusCode = 413;
          response.end("Benchmark record too large");
          request.destroy();
        }
      });
      request.on("end", async () => {
        try {
          const record = JSON.parse(body);
          if (
            record.schemaVersion !== "component-state-tree-shape-browser-v1" ||
            record.status !== "PASS" ||
            record.count !== 10_000 ||
            ![0, 10, 100, 1_000].includes(record.groupCount) ||
            !Number.isSafeInteger(record.seed) || record.seed < 0 ||
            record.measuredPairs !== 40 ||
            record.updatesPerSample !== 100 || !record.partialCommitContract ||
            !record.stableTargetIdentity ||
            !record.finalOutputParity || record.rendersPerUpdate?.react !== 1 ||
            record.rendersPerUpdate?.runtime !== 1 ||
            (record.groupCount > 0 &&
              (record.groupRendersPerUpdate?.react !== 0 ||
                record.groupRendersPerUpdate?.runtime !== 0)) ||
            !Array.isArray(record.samples) || record.samples.length !== 40
          ) {
            response.statusCode = 400;
            response.end("Tree-shape benchmark contract validation failed");
            return;
          }
          const filename =
            `browser-component-state-tree-shape-v1-${record.groupCount}-${record.seed}.json`;
          const resultsDirectory = fileURLToPath(
            new URL("./results", import.meta.url),
          );
          await mkdir(resultsDirectory, { recursive: true });
          await writeFile(
            path.join(resultsDirectory, filename),
            `${JSON.stringify(record, null, 2)}\n`,
          );
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ status: "SAVED", filename }));
        } catch (error) {
          response.statusCode = 400;
          response.end(
            error instanceof Error ? error.message : "Invalid benchmark record",
          );
        }
      });
    },
  );
  server.middlewares.use(
    "/__benchmark/save-multi-owner-batch",
    (request, response) => {
      if (request.method !== "POST") {
        response.statusCode = 405;
        response.end("Method not allowed");
        return;
      }
      let body = "";
      request.on("data", (chunk: unknown) => {
        body += String(chunk);
        if (body.length > 8_000_000) {
          response.statusCode = 413;
          response.end("Multi-owner record too large");
          request.destroy();
        }
      });
      request.on("end", async () => {
        try {
          const record = JSON.parse(body);
          const fanouts = [1, 4, 16, 64, 256];
          const validFanoutOrder = Array.isArray(record.fanoutOrder) &&
            fanouts.every((fanout) => record.fanoutOrder.includes(fanout)) &&
            record.fanoutOrder.length === fanouts.length;
          const validScenarios = Array.isArray(record.scenarios) &&
            record.scenarios.length === fanouts.length &&
            fanouts.every((fanout) => {
              const scenario = record.scenarios.find((item: any) =>
                item.fanout === fanout
              );
              return scenario?.outputParity && scenario?.stableIdentity &&
                scenario?.samples?.length === 40 &&
                scenario?.runtimeCommitBatchesPerPair === 1 &&
                scenario?.runtimeRegionsPerBatch === fanout &&
                scenario?.renderedRowsPerBatch?.runtime === fanout &&
                scenario.samples.every((sample: any) =>
                  Array.isArray(sample.order) && sample.order.length === 2 &&
                  Number.isFinite(sample.millisecondsPerBatch?.react) &&
                  Number.isFinite(sample.millisecondsPerBatch?.runtime)
                );
            });
          if (
            record.schemaVersion !== "multi-owner-batch-browser-v1" ||
            record.status !== "PASS" || record.count !== 10_000 ||
            !Number.isSafeInteger(record.seed) || record.seed <= 0 ||
            record.warmupPairs !== 8 || record.measuredPairs !== 40 ||
            !validFanoutOrder || !validScenarios ||
            !record.scenarios.every((scenario: any) =>
              scenario.outputParity && scenario.stableIdentity
            )
          ) {
            response.statusCode = 400;
            response.end(
              "Multi-owner batch benchmark contract validation failed",
            );
            return;
          }
          const filename = `browser-multi-owner-batch-v1-${record.seed}.json`;
          const resultsDirectory = fileURLToPath(
            new URL("./results", import.meta.url),
          );
          await mkdir(resultsDirectory, { recursive: true });
          await writeFile(
            path.join(resultsDirectory, filename),
            `${JSON.stringify(record, null, 2)}\n`,
          );
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ status: "SAVED", filename }));
        } catch (error) {
          response.statusCode = 400;
          response.end(
            error instanceof Error ? error.message : "Invalid benchmark record",
          );
        }
      });
    },
  );
  server.middlewares.use(
    "/__benchmark/save-component-state-structural-profile",
    (request, response) => {
      if (request.method !== "POST") {
        response.statusCode = 405;
        response.end("Method not allowed");
        return;
      }
      let body = "";
      request.on("data", (chunk: unknown) => {
        body += String(chunk);
        if (body.length > 1_000_000) {
          response.statusCode = 413;
          response.end("Structural phase profile too large");
          request.destroy();
        }
      });
      request.on("end", async () => {
        try {
          const record = JSON.parse(body);
          const operations = ["rotate", "replace-edge", "filter-half"];
          const validOperations = Array.isArray(record.operations) &&
            record.operations.length === operations.length &&
            operations.every((operation) => {
              const summary = record.operations.find((entry: any) =>
                entry.operation === operation
              );
              const phases = summary?.phaseSummaries;
              return summary?.measuredUpdates === 24 &&
                summary?.samples?.length === 24 &&
                summary.samples.every((sample: any, index: number) =>
                  sample.pair === index &&
                  Number.isFinite(sample.totalUpdateMs) &&
                  Number.isFinite(sample.rootFlushMs) &&
                  Number.isFinite(sample.outsideRootFlushMs) &&
                  Number.isFinite(sample.unattributedWithinFlushMs) &&
                  sample.workCounts &&
                  typeof sample.workCounts === "object" &&
                  Object.keys(sample.workCounts).length > 0 &&
                  Object.values(sample.workCounts).every((count: any) =>
                    Number.isSafeInteger(count) && count >= 0
                  ) &&
                  Object.values(sample.phaseCalls ?? {}).every((calls: any) =>
                    Array.isArray(calls) && calls.every(Number.isFinite)
                  )
                ) &&
                summary?.pairedTotalFlushSamples === 24 &&
                Number.isFinite(summary?.totalUpdateMedianMs) &&
                Number.isFinite(summary?.outsideRootFlushMedianMs) &&
                summary?.workCountMedians &&
                Object.values(summary.workCountMedians).every((count: any) =>
                  Number.isSafeInteger(count) && count >= 0
                ) &&
                phases?.["root.flush"]?.calls === 24 &&
                Number.isFinite(phases?.["root.flush"]?.medianMs) &&
                Object.values(phases ?? {}).every((phase: any) =>
                  Number.isInteger(phase.calls) && phase.calls >= 0 &&
                  Number.isFinite(phase.medianMs) &&
                  Number.isFinite(phase.p95Ms)
                );
            });
          if (
            record.schemaVersion !==
              "component-state-structural-browser-phase-profile-v8" ||
            record.count !== 10_000 ||
            !Number.isSafeInteger(record.seed) || record.seed <= 0 ||
            !validOperations
          ) {
            response.statusCode = 400;
            response.end("Structural phase profile contract validation failed");
            return;
          }
          const filename =
            `browser-component-state-structural-profile-v8-${record.seed}.json`;
          const resultsDirectory = fileURLToPath(
            new URL("./results", import.meta.url),
          );
          await mkdir(resultsDirectory, { recursive: true });
          await writeFile(
            path.join(resultsDirectory, filename),
            `${JSON.stringify(record, null, 2)}\n`,
          );
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ status: "SAVED", filename }));
        } catch (error) {
          response.statusCode = 400;
          response.end(
            error instanceof Error
              ? error.message
              : "Invalid structural phase profile",
          );
        }
      });
    },
  );
  server.middlewares.use(
    "/__benchmark/save-key-index-maintenance",
    (request, response) => {
      if (request.method !== "POST") {
        response.statusCode = 405;
        response.end("Method not allowed");
        return;
      }
      let body = "";
      request.on("data", (chunk: unknown) => {
        body += String(chunk);
        if (body.length > 8_000_000) {
          response.statusCode = 413;
          response.end("Key-index record too large");
          request.destroy();
        }
      });
      request.on("end", async () => {
        try {
          const record = JSON.parse(body);
          const operations = ["rotate", "replace-edge", "filter"];
          const arms = ["react", "rebuild", "delta"];
          const validScenarios = Array.isArray(record.scenarios) &&
            record.scenarios.length === operations.length &&
            operations.every((operation) => {
              const scenario = record.scenarios.find((item: any) =>
                item.operation === operation
              );
              return scenario?.outputParity && scenario?.stableIdentity &&
                scenario?.teardownEmpty && scenario.samples?.length === 24 &&
                arms.every((arm) =>
                  Number.isFinite(scenario.mountMs?.[arm]) &&
                  Number.isFinite(scenario.teardownMs?.[arm]) &&
                  Number.isFinite(scenario.updateMedianMs?.[arm]) &&
                  Number.isFinite(scenario.updateP95Ms?.[arm])
                ) && scenario.samples.every((sample: any, index: number) =>
                  sample.pair === index && sample.outputParity &&
                  arms.every((arm) =>
                    sample.identity?.[arm] === true &&
                    Number.isFinite(sample.milliseconds?.[arm])
                  ) && Array.isArray(sample.order) &&
                  sample.order.length === arms.length &&
                  arms.every((arm) =>
                    sample.order.includes(arm)
                  ) &&
                  (operation !== "filter" ||
                    ["shrink", "restore"].includes(sample.direction))
                ) && (operation !== "filter" ||
                  scenario.samples.filter((sample: any) =>
                          sample.direction === "shrink"
                        ).length === 12 &&
                    scenario.samples.filter((sample: any) =>
                        sample.direction === "restore"
                      ).length === 12);
            });
          if (
            record.schemaVersion !== "key-index-maintenance-browser-v1" ||
            record.status !== "PASS" || record.count !== 10_000 ||
            !Number.isSafeInteger(record.seed) || record.seed <= 0 ||
            record.warmupPairs !== 8 || record.measuredPairs !== 24 ||
            !validScenarios
          ) {
            response.statusCode = 400;
            response.end("Key-index maintenance contract validation failed");
            return;
          }
          const filename =
            `browser-key-index-maintenance-v1-${record.seed}.json`;
          const resultsDirectory = fileURLToPath(
            new URL("./results", import.meta.url),
          );
          await mkdir(resultsDirectory, { recursive: true });
          await writeFile(
            path.join(resultsDirectory, filename),
            `${JSON.stringify(record, null, 2)}\n`,
          );
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ status: "SAVED", filename }));
        } catch (error) {
          response.statusCode = 400;
          response.end(
            error instanceof Error
              ? error.message
              : "Invalid key-index maintenance record",
          );
        }
      });
    },
  );
  server.middlewares.use(
    "/__benchmark/save-component-state-structural",
    (request, response) => {
      if (request.method !== "POST") {
        response.statusCode = 405;
        response.end("Method not allowed");
        return;
      }
      let body = "";
      request.on("data", (chunk: unknown) => {
        body += String(chunk);
        if (body.length > 8_000_000) {
          response.statusCode = 413;
          response.end("Structural record too large");
          request.destroy();
        }
      });
      request.on("end", async () => {
        try {
          const record = JSON.parse(body);
          const operations = ["rotate", "replace-edge", "filter-half"];
          const validScenarios = Array.isArray(record.scenarios) &&
            record.scenarios.length === operations.length &&
            operations.every((operation) => {
              const scenario = record.scenarios.find((item: any) =>
                item.operation === operation
              );
              return scenario?.outputParity && scenario?.identity &&
                scenario?.retainedState && scenario?.samples?.length === 24 &&
                scenario.samples.every((sample: any) =>
                  sample.outputParity &&
                  sample.identity?.react && sample.identity?.runtime &&
                  sample.retainedState?.react &&
                  sample.retainedState?.runtime &&
                  Number.isFinite(sample.milliseconds?.react) &&
                  Number.isFinite(sample.milliseconds?.runtime)
                );
            });
          if (
            record.schemaVersion !== "component-state-structural-browser-v4" ||
            record.status !== "PASS" || record.count !== 10_000 ||
            !Number.isSafeInteger(record.seed) || record.seed <= 0 ||
            record.warmupPairs !== 8 || record.measuredPairs !== 24 ||
            !validScenarios
          ) {
            response.statusCode = 400;
            response.end("Structural benchmark contract validation failed");
            return;
          }
          const filename =
            `browser-component-state-structural-v4-${record.seed}.json`;
          const resultsDirectory = fileURLToPath(
            new URL("./results", import.meta.url),
          );
          await mkdir(resultsDirectory, { recursive: true });
          await writeFile(
            path.join(resultsDirectory, filename),
            `${JSON.stringify(record, null, 2)}\n`,
          );
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ status: "SAVED", filename }));
        } catch (error) {
          response.statusCode = 400;
          response.end(
            error instanceof Error
              ? error.message
              : "Invalid structural record",
          );
        }
      });
    },
  );
  server.middlewares.use(
    "/__benchmark/save-component-state-index-v1",
    (request, response) => {
      if (request.method !== "POST") {
        response.statusCode = 405;
        response.end("Method not allowed");
        return;
      }
      let body = "";
      request.on("data", (chunk: unknown) => {
        body += String(chunk);
        if (body.length > 8_000_000) {
          response.statusCode = 413;
          response.end("Structural index record too large");
          request.destroy();
        }
      });
      request.on("end", async () => {
        try {
          const record = JSON.parse(body);
          const armSet = ["react", "rebuild", "delta"];
          const validScenarios = Array.isArray(record.scenarios) &&
            record.scenarios.length === 3 &&
            ["rotate", "replace-edge", "filter-half"].every((operation) => {
              const scenario = record.scenarios.find((item: any) =>
                item.operation === operation
              );
              const orderCounts = new Map<string, number>();
              const pairIds = new Set<number>();
              for (const sample of scenario?.samples ?? []) {
                if (Number.isSafeInteger(sample.pair)) pairIds.add(sample.pair);
                if (Array.isArray(sample.order)) {
                  const key = sample.order.join(",");
                  orderCounts.set(key, (orderCounts.get(key) ?? 0) + 1);
                }
              }
              return scenario?.outputParity && scenario?.identity &&
                scenario?.retainedState && scenario?.samples?.length === 24 &&
                pairIds.size === 24 &&
                [...pairIds].every((pair) => pair >= 0 && pair < 24) &&
                orderCounts.size === 6 &&
                [...orderCounts.values()].every((count) => count === 4) &&
                (operation !== "filter-half" ||
                  scenario.samples.filter((sample: any) =>
                          sample.direction === "shrink"
                        ).length === 12 &&
                    scenario.samples.filter((sample: any) =>
                        sample.direction === "restore"
                      ).length === 12) &&
                (operation === "filter-half" ||
                  scenario.samples.every((sample: any) =>
                    sample.direction === null
                  )) &&
                armSet.every((arm) =>
                  Number.isFinite(scenario.medianMs?.[arm]) &&
                  Number.isFinite(scenario.p95Ms?.[arm]) &&
                  Number.isFinite(scenario.mountMs?.[arm]) &&
                  Number.isFinite(scenario.teardownMs?.[arm])
                ) && scenario.samples.every((sample: any) =>
                  Number.isSafeInteger(sample.pair) &&
                  sample.pair >= 0 && sample.pair < 24 &&
                  sample.outputParity &&
                  armSet.every((arm) =>
                    sample.identity?.[arm] === true &&
                    sample.retainedState?.[arm] === true &&
                    Number.isFinite(sample.milliseconds?.[arm])
                  ) && Array.isArray(sample.order) &&
                  sample.order.length === 3 &&
                  [...sample.order].sort().join(",") === "delta,react,rebuild"
                );
            });
          const failures = [
            record.schemaVersion !==
                "component-state-structural-index-browser-v1"
              ? "schema"
              : null,
            record.status !== "PASS" ? "status" : null,
            record.count !== 10_000 ? "count" : null,
            !Number.isSafeInteger(record.seed) || record.seed <= 0
              ? "seed"
              : null,
            record.warmupPairs !== 8 ? "warmupPairs" : null,
            record.measuredPairs !== 24 ? "measuredPairs" : null,
            record.browser?.visibilityState !== "visible" ? "visibility" : null,
            !validScenarios ? "scenario-contract" : null,
          ].filter(Boolean);
          if (failures.length > 0) {
            response.statusCode = 400;
            const scenarioAudit = Array.isArray(record.scenarios)
              ? record.scenarios.map((scenario: any) => ({
                operation: scenario.operation,
                parity: scenario.outputParity,
                identity: scenario.identity,
                retainedState: scenario.retainedState,
                sampleCount: scenario.samples?.length,
                directions: scenario.samples?.reduce(
                  (counts: Record<string, number>, sample: any) => {
                    const direction = sample.direction ?? "null";
                    counts[direction] = (counts[direction] ?? 0) + 1;
                    return counts;
                  },
                  {},
                ),
                firstOrder: scenario.samples?.[0]?.order,
                finiteTimes: ["react", "rebuild", "delta"].every((arm) =>
                  Number.isFinite(scenario.medianMs?.[arm]) &&
                  Number.isFinite(scenario.p95Ms?.[arm]) &&
                  Number.isFinite(scenario.mountMs?.[arm]) &&
                  Number.isFinite(scenario.teardownMs?.[arm])
                ),
                allSamplesPass: scenario.samples?.every((sample: any) =>
                  sample.outputParity &&
                  ["react", "rebuild", "delta"].every((arm) =>
                    sample.identity?.[arm] === true &&
                    sample.retainedState?.[arm] === true &&
                    Number.isFinite(sample.milliseconds?.[arm])
                  ) && Array.isArray(sample.order) &&
                  sample.order.length === 3 &&
                  [...sample.order].sort().join(",") === "delta,react,rebuild"
                ),
              }))
              : null;
            response.end(
              `Structural index contract failed: ${failures.join(",")}; ${
                JSON.stringify(scenarioAudit)
              }`,
            );
            return;
          }
          const filename =
            `browser-component-state-structural-index-v1-${record.seed}.json`;
          const resultsDirectory = fileURLToPath(
            new URL(
              "./results/component-state-structural-index-v1",
              import.meta.url,
            ),
          );
          await mkdir(resultsDirectory, { recursive: true });
          await writeFile(
            path.join(resultsDirectory, filename),
            `${JSON.stringify(record, null, 2)}\n`,
          );
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ status: "SAVED", filename }));
        } catch (error) {
          response.statusCode = 400;
          response.end(
            error instanceof Error
              ? error.message
              : "Invalid structural index record",
          );
        }
      });
    },
  );
  server.middlewares.use(
    "/__benchmark/save-component-state-owner-reuse-v2",
    (request, response) => {
      if (request.method !== "POST") {
        response.statusCode = 405;
        response.end("Method not allowed");
        return;
      }
      let body = "";
      request.on("data", (chunk: unknown) => {
        body += String(chunk);
        if (body.length > 10_000_000) {
          response.statusCode = 413;
          response.end("Owner reuse V2 record too large");
          request.destroy();
        }
      });
      request.on("end", async () => {
        try {
          const record = JSON.parse(body);
          const allowedSeeds = new Set([
            83005101,
            83005102,
            83005103,
            83005104,
            83005105,
          ]);
          const arms = ["generic", "react", "reuse", "token"];
          const scenariosValid = Array.isArray(record.scenarios) &&
            record.scenarios.length === 3 &&
            ["rotate", "replace-edge", "filter-half"].every(
              (operation: string) => {
                const scenario = record.scenarios.find((item: any) =>
                  item.operation === operation
                );
                const orderKeys = new Set(
                  (scenario?.samples ?? []).map((sample: any) =>
                    Array.isArray(sample.order)
                      ? sample.order.join(",")
                      : "invalid"
                  ),
                );
                return typeof scenario?.outputParity === "boolean" &&
                  typeof scenario.identity === "boolean" &&
                  typeof scenario.retainedState === "boolean" &&
                  (scenario.mechanismPass === null ||
                    typeof scenario.mechanismPass === "boolean") &&
                  scenario.samples?.length === 24 &&
                  orderKeys.size === 24 && arms.every((arm) =>
                    Number.isFinite(scenario.pageMedianMs?.[arm]) &&
                    Number.isFinite(scenario.pageP95Ms?.[arm]) &&
                    Number.isFinite(scenario.mountMs?.[arm]) &&
                    Number.isFinite(scenario.teardownMs?.[arm])
                  ) && scenario.samples.every((sample: any) =>
                    typeof sample.outputParity === "boolean" &&
                    Array.isArray(sample.order) &&
                    sample.order.length === 4 &&
                    [...sample.order].sort().join(",") ===
                      "generic,react,reuse,token" &&
                    arms.every((arm) =>
                      Number.isFinite(sample.milliseconds?.[arm]) &&
                      typeof sample.identity?.[arm] === "boolean" &&
                      typeof sample.retainedState?.[arm] === "boolean"
                    )
                  ) && (operation !== "filter-half" ||
                    scenario.samples.filter((sample: any) =>
                            sample.direction === "shrink"
                          ).length === 12 &&
                      scenario.samples.filter((sample: any) =>
                          sample.direction === "restore"
                        ).length === 12) &&
                  (operation === "filter-half" ||
                    scenario.samples.every((sample: any) =>
                      sample.direction === null
                    ));
              },
            );
          const failures = [
            record.schemaVersion !== "component-state-owner-reuse-browser-v2"
              ? "schema"
              : null,
            !["PASS", "FAIL"].includes(record.status) ? "status" : null,
            !["latency", "diagnostic"].includes(record.mode) ? "mode" : null,
            !allowedSeeds.has(record.seed) ? "seed" : null,
            record.count !== 10_000 ? "count" : null,
            record.warmupPairs !== 8 ? "warmups" : null,
            record.measuredPairs !== 24 ? "pairs" : null,
            record.browser?.visibilityState !== "visible" ? "visibility" : null,
            !scenariosValid ? "scenario-contract" : null,
            record.status === "PASS" &&
              record.scenarios?.some((scenario: any) =>
                scenario.outputParity !== true || scenario.identity !== true ||
                scenario.retainedState !== true ||
                (record.mode === "diagnostic" &&
                  scenario.mechanismPass !== true)
              )
              ? "pass-status-mismatch"
              : null,
          ].filter(Boolean);
          if (failures.length) {
            response.statusCode = 400;
            response.end(
              `Owner reuse V2 contract failed: ${failures.join(",")}`,
            );
            return;
          }
          const subdirectory = record.mode === "diagnostic"
            ? "diagnostic"
            : "latency";
          const outcome = record.status === "PASS" ? "pass" : "fail";
          const filename =
            `browser-component-state-owner-reuse-v2-${record.seed}-${record.mode}-${outcome}.json`;
          const resultsDirectory = fileURLToPath(
            new URL(
              `./results/component-state-owner-reuse-v2/${subdirectory}`,
              import.meta.url,
            ),
          );
          await mkdir(resultsDirectory, { recursive: true });
          await writeFile(
            path.join(resultsDirectory, filename),
            `${JSON.stringify(record, null, 2)}\n`,
            { flag: "wx" },
          );
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ status: "SAVED", filename }));
        } catch (error) {
          response.statusCode = 400;
          response.end(
            error instanceof Error
              ? error.message
              : "Invalid owner reuse V2 record",
          );
        }
      });
    },
  );
  server.middlewares.use(
    "/__benchmark/save-component-state-owner-reuse-v1",
    (request, response) => {
      if (request.method !== "POST") {
        response.statusCode = 405;
        response.end("Method not allowed");
        return;
      }
      let body = "";
      request.on("data", (chunk: unknown) => {
        body += String(chunk);
        if (body.length > 8_000_000) {
          response.statusCode = 413;
          response.end("Owner reuse record too large");
          request.destroy();
        }
      });
      request.on("end", async () => {
        try {
          const record = JSON.parse(body);
          const allowedSeeds = new Set([
            83005001,
            83005002,
            83005003,
            83005004,
            83005005,
          ]);
          const arms = ["react", "generic", "reuse"];
          const scenariosValid = Array.isArray(record.scenarios) &&
            record.scenarios.length === 3 &&
            ["rotate", "replace-edge", "filter-half"].every((operation) => {
              const scenario = record.scenarios.find((item: any) =>
                item.operation === operation
              );
              const pairIds = new Set<number>();
              const orderCounts = new Map<string, number>();
              for (const sample of scenario?.samples ?? []) {
                if (Number.isSafeInteger(sample.pair)) pairIds.add(sample.pair);
                if (Array.isArray(sample.order)) {
                  const key = sample.order.join(",");
                  orderCounts.set(key, (orderCounts.get(key) ?? 0) + 1);
                }
              }
              return scenario?.outputParity === true &&
                scenario?.identity === true &&
                scenario?.retainedState === true &&
                scenario?.samples?.length === 24 && pairIds.size === 24 &&
                [...pairIds].every((pair) => pair >= 0 && pair < 24) &&
                orderCounts.size === 6 &&
                [...orderCounts.values()].every((count) => count === 4) &&
                arms.every((arm) =>
                  Number.isFinite(scenario.pageMedianMs?.[arm]) &&
                  Number.isFinite(scenario.pageP95Ms?.[arm]) &&
                  Number.isFinite(scenario.mountMs?.[arm]) &&
                  Number.isFinite(scenario.teardownMs?.[arm])
                ) &&
                (operation !== "filter-half" ||
                  scenario.samples.filter((sample: any) =>
                          sample.direction === "shrink"
                        ).length === 12 &&
                    scenario.samples.filter((sample: any) =>
                        sample.direction === "restore"
                      ).length === 12) &&
                (operation === "filter-half" ||
                  scenario.samples.every((sample: any) =>
                    sample.direction === null
                  )) &&
                scenario.samples.every((sample: any) =>
                  sample.outputParity === true &&
                  Array.isArray(sample.order) && sample.order.length === 3 &&
                  [...sample.order].sort().join(",") ===
                    "generic,react,reuse" &&
                  arms.every((arm) =>
                    Number.isFinite(sample.milliseconds?.[arm]) &&
                    sample.identity?.[arm] === true &&
                    sample.retainedState?.[arm] === true
                  ) &&
                  (record.mode !== "diagnostic" ||
                    sample.diagnosticCounters?.generic &&
                      sample.diagnosticCounters?.reuse)
                );
            });
          const failures = [
            record.schemaVersion !== "component-state-owner-reuse-browser-v1"
              ? "schema"
              : null,
            record.status !== "PASS" ? "status" : null,
            !["latency", "diagnostic"].includes(record.mode) ? "mode" : null,
            !allowedSeeds.has(record.seed) ? "seed" : null,
            record.count !== 10_000 ? "count" : null,
            record.warmupPairs !== 8 ? "warmupPairs" : null,
            record.measuredPairs !== 24 ? "measuredPairs" : null,
            record.browser?.visibilityState !== "visible" ? "visibility" : null,
            !scenariosValid ? "scenario-contract" : null,
          ].filter(Boolean);
          if (failures.length) {
            response.statusCode = 400;
            response.end(`Owner reuse contract failed: ${failures.join(",")}`);
            return;
          }
          const subdirectory = record.mode === "diagnostic"
            ? "diagnostic"
            : "latency";
          const filename =
            `browser-component-state-owner-reuse-v1-${record.seed}.json`;
          const resultsDirectory = fileURLToPath(
            new URL(
              `./results/component-state-owner-reuse-v1/${subdirectory}`,
              import.meta.url,
            ),
          );
          await mkdir(resultsDirectory, { recursive: true });
          await writeFile(
            path.join(resultsDirectory, filename),
            `${JSON.stringify(record, null, 2)}\n`,
            { flag: "wx" },
          );
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ status: "SAVED", filename }));
        } catch (error) {
          response.statusCode = 400;
          response.end(
            error instanceof Error
              ? error.message
              : "Invalid owner reuse record",
          );
        }
      });
    },
  );
  server.middlewares.use(
    "/__benchmark/save-snake-frame",
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
          response.end("Snake frame record too large");
          request.destroy();
        }
      });
      request.on("end", async () => {
        try {
          const record = JSON.parse(body);
          const versionFour = record.schemaVersion ===
            "snake-frame-browser-v4";
          const versionFive = record.schemaVersion ===
            "snake-frame-browser-v5";
          const versionSix = record.schemaVersion ===
            "snake-frame-browser-v6";
          const validArm = (versionSix
            ? ["react", "runtime", "generated-vdom", "columnar-vdom", "direct"]
            : versionFour || versionFive
            ? ["react", "runtime", "generated", "generated-vdom", "direct"]
            : ["react", "runtime", "direct"]).includes(record.arm);
          const validSize = [32, 128, 512, 1024].includes(record.segmentCount);
          const validFrameCount = [60, 300, 600, 1200].includes(
            record.measuredFrames,
          );
          const validSamples = Array.isArray(record.samples) &&
            record.samples.length === record.measuredFrames &&
            record.samples.every((sample: any) =>
              Number.isSafeInteger(sample.frame) &&
              Number.isFinite(sample.intervalMs) && sample.intervalMs >= 0 &&
              Number.isFinite(sample.updateCpuMs) && sample.updateCpuMs >= 0 &&
              Number.isFinite(sample.commitMs) && sample.commitMs >= 0
            );
          if (
            ![
              "snake-frame-browser-v3",
              "snake-frame-browser-v4",
              "snake-frame-browser-v5",
              "snake-frame-browser-v6",
            ].includes(record.schemaVersion) ||
            record.status !== "PASS" || !record.allContractsPass ||
            !record.completeCommitCoverage ||
            !validArm || !validSize ||
            !validFrameCount || record.warmupFrames !== 90 ||
            !/^[0-9a-f-]{36}$/i.test(record.pageLoadId) ||
            typeof record.trialId !== "string" ||
            record.browser?.visibilityState !== "visible" ||
            !record.allOutputMatches || !record.stableNodeCount ||
            !record.stableNodeIdentity || !validSamples ||
            ((versionFive || versionSix) &&
              (!Number.isFinite(record.mountMs) || record.mountMs < 0 ||
                ![
                  record.heapUsedBeforeMountBytes,
                  record.heapUsedAfterMountBytes,
                  record.heapUsedAfterMeasuredFramesBytes,
                ].every((value: any) =>
                  value === null ||
                  (Number.isFinite(value) && value >= 0)
                )))
          ) {
            response.statusCode = 400;
            response.end("Snake frame benchmark record contract failed");
            return;
          }
          const version = versionSix
            ? "v6"
            : versionFive
            ? "v5"
            : versionFour
            ? "v4"
            : "v3";
          const productionCollection = versionFive &&
            record.collection === "production" &&
            record.buildMode === "production" &&
            record.trialId.startsWith("production-");
          const productionV6Collection = versionSix &&
            record.collection === "production-v6" &&
            record.buildMode === "production" &&
            record.trialId.startsWith("v6-");
          if (
            (record.collection === "production" && !productionCollection) ||
            (record.collection === "production-v6" &&
              !productionV6Collection)
          ) {
            response.statusCode = 400;
            response.end(
              "Production collection must run its preregistered build",
            );
            return;
          }
          const filename =
            `browser-snake-frame-${version}-${record.segmentCount}-${record.arm}-${record.pageLoadId}.json`;
          const resultsRoot = fileURLToPath(
            new URL("./results", import.meta.url),
          );
          const resultsDirectory = productionCollection
            ? path.join(resultsRoot, "v5-production")
            : productionV6Collection
            ? path.join(resultsRoot, "v6-production")
            : resultsRoot;
          await mkdir(resultsDirectory, { recursive: true });
          await writeFile(
            path.join(resultsDirectory, filename),
            `${JSON.stringify(record, null, 2)}\n`,
          );
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ status: "SAVED", filename }));
        } catch (error) {
          response.statusCode = 400;
          response.end(
            error instanceof Error
              ? error.message
              : "Invalid Snake frame record",
          );
        }
      });
    },
  );
  server.middlewares.use("/__benchmark/save-mixed-realtime", (request, response) => {
    if (request.method !== "POST") {
      response.statusCode = 405;
      response.end("Method not allowed");
      return;
    }
    let body = "";
    request.on("data", (chunk: unknown) => {
      body += String(chunk);
      if (body.length > 2_000_000) {
        response.statusCode = 413;
        response.end("Mixed real-time record too large");
        request.destroy();
      }
    });
    request.on("end", async () => {
      try {
        const record = JSON.parse(body);
        const valid = record.schemaVersion === "mixed-realtime-browser-v1" &&
          ["react", "runtime"].includes(record.arm) &&
          record.status === "PASS" && record.outputParity &&
          record.stableNodeCount && record.structureIdentityPass &&
          record.completeCommitCoverage &&
          ["pilot", "mixed-v1"].includes(record.collection) &&
          (record.collection !== "mixed-v1" ||
            (record.buildMode === "production" &&
              record.browser?.visibilityState === "visible" &&
              record.measuredFrames === 240 && record.warmupFrames === 60 &&
              Number.isInteger(record.sequence) && Number.isInteger(record.replication))) &&
          [128, 256, 512, 1024].includes(record.entityCount) &&
          record.samples?.length === record.measuredFrames &&
          record.samples.every((sample: any) =>
            Number.isFinite(sample.updateCpuMs) && Number.isFinite(sample.commitMs) &&
            Number.isFinite(sample.intervalMs)
          );
        if (!valid) {
          response.statusCode = 400;
          response.end("Mixed real-time record contract failed");
          return;
        }
        const resultsDirectory = fileURLToPath(
          new URL(
            record.collection === "mixed-v1"
              ? "./results/mixed-realtime-v1"
              : "./results/mixed-realtime-pilot",
            import.meta.url,
          ),
        );
        await mkdir(resultsDirectory, { recursive: true });
        const filename = `mixed-${record.arm}-n${record.entityCount}-${Date.now()}.json`;
        await writeFile(path.join(resultsDirectory, filename), `${JSON.stringify(record, null, 2)}\n`);
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ status: "SAVED", filename }));
      } catch (error) {
        response.statusCode = 400;
        response.end(error instanceof Error ? error.message : "Invalid mixed real-time record");
      }
    });
  });
};

const benchmarkArchivePlugin: Plugin = {
  name: "browser-benchmark-archive",
  configureServer: installBenchmarkArchive,
  configurePreviewServer: installBenchmarkArchive,
};

const oxcGeneratedClassicJsxPlugin: Plugin = {
  name: "oxc-generated-classic-jsx",
  enforce: "pre",
  async transform(code, id) {
    if (
      !id.endsWith(".tsx") ||
      (!code.includes("@jsxRuntime classic") &&
        !id.includes("/generated_component_state_"))
    ) {
      return null;
    }
    return await transformWithOxc(code, id, {
      lang: "tsx",
      jsx: { runtime: "classic" },
    });
  },
};

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
    benchmarkArchivePlugin,
    { ...vitexec({ directory: false }), apply: "serve" },
    nativeModulePlugin(),
    oxcGeneratedClassicJsxPlugin,
    react({
      // Native modules own their remount/disposal policy and use a different
      // component runtime. React Refresh must not register those components.
      exclude: /\/src\/browser\/(?:native_[^/]+|async_transition_stress_v1)\.tsx(?:\?.*)?$/,
      babel: (id) => ({
        plugins: id.endsWith("/src/browser/main.tsx") ||
            id.endsWith("/src/browser/react_baseline.tsx") ||
            id.endsWith("/src/browser/multi_source_benchmark.tsx") ||
            id.endsWith("/src/browser/shared_source_benchmark.tsx") ||
            id.endsWith("/src/browser/vdom_react_benchmark.tsx") ||
            id.endsWith("/src/browser/keyed_filter_benchmark.tsx") ||
            id.endsWith("/src/browser/component_state_react_benchmark.tsx") ||
            id.endsWith("/src/browser/keyed_region_graph_benchmark.tsx") ||
            id.endsWith("/src/browser/async_suspense_benchmark.tsx") ||
            id.endsWith("/src/browser/urgent_transition_benchmark.tsx") ||
            id.endsWith("/src/browser/async_task_reuse_browser.tsx") ||
            id.endsWith("/src/browser/multi_owner_batch_benchmark.tsx") ||
            id.endsWith(
              "/src/browser/component_state_structural_benchmark.tsx",
            ) ||
            id.endsWith("/src/browser/component_state_index_benchmark.tsx") ||
            id.endsWith(
              "/src/browser/component_state_owner_reuse_benchmark.tsx",
            ) ||
            id.endsWith(
              "/src/browser/key_index_maintenance_benchmark.tsx",
            ) ||
            id.endsWith("/src/browser/snake_frame_benchmark.tsx") ||
            id.endsWith("/src/browser/mixed_realtime_benchmark.tsx") ||
            id.endsWith("/src/browser/snake_lifecycle_v1_benchmark.tsx") ||
            id.endsWith("/src/browser/snake_frame_cadence_v1_benchmark.tsx") ||
            id.endsWith("/src/browser/snake_frame_phase_v1_benchmark.tsx") ||
            id.endsWith("/src/browser/snake_sparse_frame_benchmark.tsx")
          ? [["babel-plugin-react-compiler", { target: "19" }]]
          : [],
      }),
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        nativeResourceBoundaries: fileURLToPath(new URL("./native-resource-boundaries.html", import.meta.url)),
        nativeThreeHost: fileURLToPath(new URL("./native-three-host.html", import.meta.url)),
        nativeTaskTransitions: fileURLToPath(new URL("./native-task-transitions.html", import.meta.url)),
        nativeRootQueue: fileURLToPath(new URL("./native-root-queue.html", import.meta.url)),
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        nativeStateProps: fileURLToPath(
          new URL("./native-state-props.html", import.meta.url),
        ),
        nativeCollectionProps: fileURLToPath(
          new URL("./native-collection-props.html", import.meta.url),
        ),
        jsxPrototype: fileURLToPath(
          new URL("./jsx-prototype.html", import.meta.url),
        ),
        multiSourceCheck: fileURLToPath(
          new URL("./multi-source-check.html", import.meta.url),
        ),
        multiSourceBenchmark: fileURLToPath(
          new URL("./multi-source-benchmark.html", import.meta.url),
        ),
        sharedSourceBenchmark: fileURLToPath(
          new URL("./shared-source-benchmark.html", import.meta.url),
        ),
        vdomRuntimeSmoke: fileURLToPath(
          new URL("./vdom-runtime-smoke.html", import.meta.url),
        ),
        keyedStructuralDifferential: fileURLToPath(
          new URL("./keyed-structural-differential.html", import.meta.url),
        ),
        eventSourceDifferential: fileURLToPath(
          new URL("./event-source-differential.html", import.meta.url),
        ),
        componentStateDifferential: fileURLToPath(
          new URL("./component-state-differential.html", import.meta.url),
        ),
        componentStateReactBenchmark: fileURLToPath(
          new URL("./component-state-react-benchmark.html", import.meta.url),
        ),
        multiOwnerBatchBenchmark: fileURLToPath(
          new URL("./multi-owner-batch-benchmark.html", import.meta.url),
        ),
        componentStateStructuralBenchmark: fileURLToPath(
          new URL(
            "./component-state-structural-benchmark.html",
            import.meta.url,
          ),
        ),
        componentStateIndexBenchmark: fileURLToPath(
          new URL("./component-state-index-benchmark.html", import.meta.url),
        ),
        componentStateOwnerReuseBenchmark: fileURLToPath(
          new URL(
            "./component-state-owner-reuse-benchmark.html",
            import.meta.url,
          ),
        ),
        componentStateOwnerReuseV2Benchmark: fileURLToPath(
          new URL(
            "./component-state-owner-reuse-v2-benchmark.html",
            import.meta.url,
          ),
        ),
        keyIndexMaintenanceBenchmark: fileURLToPath(
          new URL("./key-index-maintenance-benchmark.html", import.meta.url),
        ),
        componentStateTreeShapeBenchmark: fileURLToPath(
          new URL(
            "./component-state-tree-shape-benchmark.html",
            import.meta.url,
          ),
        ),
        asyncSuspenseBenchmark: fileURLToPath(
          new URL("./async-suspense-benchmark.html", import.meta.url),
        ),
        asyncTransitionStressV1: fileURLToPath(
          new URL("./async-transition-stress-v1.html", import.meta.url),
        ),
        asyncDagFrontierBenchmark: fileURLToPath(
          new URL("./async-dag-frontier-benchmark.html", import.meta.url),
        ),
        urgentTransitionBenchmark: fileURLToPath(
          new URL("./urgent-transition-benchmark.html", import.meta.url),
        ),
        asyncTaskReuseBenchmark: fileURLToPath(
          new URL("./async-task-reuse-browser.html", import.meta.url),
        ),
        retainedVdomReactBenchmark: fileURLToPath(
          new URL("./retained-vdom-react-benchmark.html", import.meta.url),
        ),
        keyedFilterBenchmark: fileURLToPath(
          new URL("./keyed-filter-benchmark.html", import.meta.url),
        ),
        snakeFrameBenchmark: fileURLToPath(
          new URL("./snake-frame-benchmark.html", import.meta.url),
        ),
        mixedRealtimeBenchmark: fileURLToPath(
          new URL("./mixed-realtime-benchmark.html", import.meta.url),
        ),
        snakeLifecycleV1Benchmark: fileURLToPath(
          new URL("./snake-lifecycle-v1-benchmark.html", import.meta.url),
        ),
        snakeFrameCadenceV1Benchmark: fileURLToPath(
          new URL("./snake-frame-cadence-v1-benchmark.html", import.meta.url),
        ),
        snakeFramePhaseV1Benchmark: fileURLToPath(
          new URL("./snake-frame-phase-v1-benchmark.html", import.meta.url),
        ),
        snakeSparseFrameBenchmark: fileURLToPath(
          new URL("./snake-sparse-frame-benchmark.html", import.meta.url),
        ),
        snakeGame: fileURLToPath(
          new URL("./snake-game.html", import.meta.url),
        ),
      },
    },
  },
});
