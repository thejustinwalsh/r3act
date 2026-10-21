import {
  snakeFrameV5ArmOrders,
  snakeFrameV5Arms,
  snakeFrameV5Counts,
  snakeFrameV5ProductionPages,
  snakeFrameV5SizeOrders,
} from "../src/browser/snake_frame_v5_schedule.ts";

const frozenAt = new Date().toISOString();
const baseUrl =
  "https://snake-frame-v5-production.localhost:1355/snake-frame-benchmark.html";
const pages = snakeFrameV5ProductionPages().map((page) => {
  const query = new URLSearchParams({
    protocol: "v5",
    collection: "production",
    arm: page.arm,
    segments: String(page.segmentCount),
    frames: "300",
    trial: page.trialId,
    autoplay: "1",
    sequence: String(page.sequence - 1),
  });
  return { ...page, url: `${baseUrl}?${query}` };
});

const schedule = {
  schemaVersion: "snake-frame-browser-v5-production-preregistration-v1",
  status: "PREREGISTERED",
  frozenAt,
  amendment: {
    id: "V5-PROD-AMD-1",
    relation: "Confirmatory production-build replication of V5",
    reason:
      "The completed V5 collection used Vite development mode. This frozen schedule repeats the same arms, sizes, order, and frame workload against the optimized production build.",
    dataCollectedBeforeAmendment: true,
    developmentDataset:
      "results/browser-snake-frame-v5-manifest.json; remains immutable and separate",
  },
  buildMode: "production",
  protocol: {
    question:
      "Do the per-frame update and mount results from V5 persist when React and the retained runtime are served from the same Vite production build?",
    arms: [...snakeFrameV5Arms],
    segmentCounts: [...snakeFrameV5Counts],
    pageLoadsPerCell: 5,
    totalPageLoads: pages.length,
    warmupFrames: 90,
    measuredFramesPerPage: 300,
    replicationUnit: "isolated visible browser page load",
    orderStrategy:
      "Exact five-cycle Latin rotation and rotated size order from V5",
    armOrders: snakeFrameV5ArmOrders,
    sizeOrders: snakeFrameV5SizeOrders,
    styles:
      "all arms write segment left/top; food transform is written once per RAF",
    commonWork:
      "segment coordinates are derived once per entity inside each measured RAF callback before arm dispatch",
    armsDescription: {
      react:
        "React 19.3.0 + React Compiler; per-segment useSyncExternalStore snapshots",
      runtime:
        "retained VDOM; runtime-discovered scalar-to-left/top bindings through one progress source",
      "generated-vdom":
        "retained VDOM; OXC-emitted CSR binding IDs and compiled source slots, updated as one batch",
      generated:
        "OXC-emitted repeated-host plan and generated static left/top writers",
      direct: "cached host elements with direct left/top style writes",
    },
    primaryMetric:
      "update-to-commit milliseconds; React layout-effect timestamp, synchronous return for other arms",
    secondaryMetrics: [
      "per-page mount-to-first-commit milliseconds",
      "update-path CPU milliseconds",
      "per-page RAF interval p95 milliseconds",
      "median per-page setup-plus-N-updates break-even estimate",
      "Chrome heap used before mount, after mount, and after measured updates when available",
    ],
    exclusions: [
      "compiler execution",
      "JavaScript bundle parse and evaluation",
      "layout, paint, GPU, and physical presentation",
      "allocation byte counts and precise per-component retained heap attribution",
    ],
    analysis:
      "page loads are independent replication units; RAF callbacks are nested samples; report median of page medians and median of page p95 values; publish all passing raw pages; do not exclude outliers post hoc",
    environmentTarget:
      "Same visible Chrome 154 MacIntel profile and viewport as development V5; record actual environment in every page",
  },
  pages,
};
await Deno.writeTextFile(
  "results/browser-snake-frame-v5-production-preregistration.json",
  `${JSON.stringify(schedule, null, 2)}\n`,
);
console.log(
  `Wrote production V5 schedule: ${pages.length} page loads × 300 measured RAF callbacks.`,
);
