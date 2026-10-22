import {
  snakeFrameV6Arms,
  snakeFrameV6Pages,
  snakeFrameV6Sizes,
} from "../src/browser/snake_frame_v6_schedule.ts";

const frozenAt = new Date().toISOString();
const baseUrl =
  "https://snake-frame-v6-columnar.localhost:1355/snake-frame-benchmark.html";
const pages = snakeFrameV6Pages().map((page) => {
  const query = new URLSearchParams({
    protocol: "v6",
    collection: "production-v6",
    arm: page.arm,
    segments: String(page.segmentCount),
    frames: "300",
    trial: page.trialId,
    autoplay: "1",
    sequence: String(page.sequence),
  });
  return { ...page, url: `${baseUrl}?${query}` };
});
const schedule = {
  schemaVersion: "snake-frame-browser-v6-production-preregistration-v1",
  status: "PREREGISTERED",
  frozenAt,
  design: {
    purpose:
      "Test whether a data-oriented compiler binding to numeric trait columns lowers update CPU while preserving the production commit-delay advantage.",
    relation:
      "Follow-up to production V5; V5 source records and hashes remain unchanged.",
    totalPageLoads: pages.length,
    sizes: [...snakeFrameV6Sizes],
    arms: [...snakeFrameV6Arms],
    replicationsPerCell: 5,
    warmupFrames: 90,
    measuredFrames: 300,
    replicationUnit: "isolated visible browser page load",
    buildMode: "production",
    order: "Five fixed arm rotations and three-position size rotation per replication; see each page sequence.",
    dataLayout:
      "The Snake model computes per-entity x/y into reusable Float64Array columns for every arm; no arm converts an object-per-entity position array into columns during measurement.",
    armsDescription: {
      react:
        "React 19.3.0 + React Compiler; per-segment useSyncExternalStore snapshots consuming the same x/y columns",
      runtime:
        "runtime-discovered retained-VDOM bindings, one progress source, reading shared x/y columns",
      "generated-vdom":
        "existing OXC CSR compiled prop IDs through the generic ScalarSource/setSources path",
      "columnar-vdom":
        "OXC CSR prop IDs bound to contiguous Float64Array x/y columns; mount resolves entity rows to host writers; one setColumns batch per frame",
      direct:
        "cached DOM hosts with direct left/top writes from the same columns",
    },
    primaryMetric:
      "update-to-commit milliseconds; React layout-effect timestamp, synchronous return for other arms",
    secondaryMetrics: [
      "update-path CPU milliseconds",
      "mount-to-first-commit milliseconds",
      "per-page RAF interval p95 milliseconds",
      "per-page Chrome heap snapshots when available",
    ],
    analysis:
      "Report five page summaries per cell; each page is the replication unit and its 300 RAFs are nested. Report paired per-replication ratios to React and all individual direction counts. No post-hoc outlier exclusions.",
    contracts: [
      "300 samples with complete React commit coverage",
      "output positions match the deterministic Snake model",
      "host count and host identity remain stable during measured frames",
      "visible Chrome page and stable environment across all trials",
    ],
    exclusions: [
      "JavaScript bundle parse and evaluation",
      "compiler execution",
      "layout, paint, GPU work, and physical presentation",
    ],
  },
  pages,
};
await Deno.writeTextFile(
  "results/browser-snake-frame-v6-production-preregistration.json",
  `${JSON.stringify(schedule, null, 2)}\n`,
);
console.log(
  `Wrote V6 production schedule: ${pages.length} pages × 300 measured RAF callbacks.`,
);
