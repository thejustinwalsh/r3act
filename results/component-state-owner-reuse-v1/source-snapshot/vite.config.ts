import react from "@vitejs/plugin-react";
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

const installBenchmarkArchive = (server: ViteDevServer | PreviewServer) => {
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
                  [...sample.order].sort().join(",") === "generic,react,reuse" &&
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
            new URL(`./results/component-state-owner-reuse-v1/${subdirectory}`, import.meta.url),
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
            error instanceof Error ? error.message : "Invalid owner reuse record",
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
    oxcGeneratedClassicJsxPlugin,
    react({
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
            id.endsWith("/src/browser/component_state_owner_reuse_benchmark.tsx") ||
            id.endsWith(
              "/src/browser/key_index_maintenance_benchmark.tsx",
            ) ||
            id.endsWith("/src/browser/snake_frame_benchmark.tsx") ||
            id.endsWith("/src/browser/snake_sparse_frame_benchmark.tsx")
          ? [["babel-plugin-react-compiler", { target: "19" }]]
          : [],
      }),
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
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
          new URL("./component-state-owner-reuse-benchmark.html", import.meta.url),
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
